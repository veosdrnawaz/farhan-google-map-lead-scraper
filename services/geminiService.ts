import { GoogleGenAI } from "@google/genai";
import { Lead } from "../types";

// Initialize Gemini Client
// NOTE: API_KEY is expected to be in the environment variables.
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const searchLeads = async (
  keyword: string, 
  city: string, 
  limit: number,
  excludeNames: string[] = [],
  onBatchResults?: (leads: Lead[]) => void, // New callback for real-time updates
  signal?: AbortSignal // Signal to stop execution
): Promise<{ leads: Lead[]; groundingUrls: string[] }> => {
  const allLeads: Lead[] = [];
  const allGroundingUrls: Set<string> = new Set();
  let currentExcludeList = [...excludeNames];
  
  // We fetch in batches to maximize quality and avoid truncation
  const BATCH_SIZE = 20; 
  
  try {
    const modelId = "gemini-2.5-flash"; 

    while (allLeads.length < limit) {
      if (signal?.aborted) {
          console.log("Search aborted by user");
          break;
      }

      const remaining = limit - allLeads.length;
      const batchTarget = Math.min(remaining, BATCH_SIZE);
      
      const excludeString = currentExcludeList.length > 0 
        ? `\nIMPORTANT: DO NOT include any of these businesses in your response: ${JSON.stringify(currentExcludeList.slice(-100))}. Find DIFFERENT ones.` 
        : "";

      const prompt = `
        Find ${batchTarget} actual businesses matching the keyword "${keyword}" in or near "${city}".
        
        Step 1: Use the Google Maps tool to verify their existence, exact address, correct phone number, and rating.
        Step 2: Look for their official website and any social media profiles (Facebook, Instagram, LinkedIn, Twitter) associated with them.
        Step 3: Ensure you extract the specific business category.
        
        ${excludeString}
        
        Return the data as a STRICT JSON Array inside a markdown code block (\`\`\`json ... \`\`\`).
        
        Each object in the array must strictly follow this structure:
        {
          "name": "Business Name (Exact as on Maps)",
          "address": "Full Address",
          "phoneNumber": "Local Phone Number (e.g. 0300 1234567) preferred over International if available, else Standard",
          "website": "Website URL or 'N/A'",
          "rating": 4.5, (number)
          "reviewCount": 100, (number)
          "category": "Primary Business Category",
          "latitude": 0.0, (number, optional if available)
          "longitude": 0.0, (number, optional if available)
          "socialProfiles": {
             "facebook": "url or empty string",
             "instagram": "url or empty string",
             "linkedin": "url or empty string",
             "twitter": "url or empty string"
          }
        }

        Do not include any other conversational text outside the JSON code block.
      `;

      const response = await ai.models.generateContent({
        model: modelId,
        contents: prompt,
        config: {
          tools: [{ googleMaps: {} }],
        },
      });

      if (signal?.aborted) break;

      const text = response.text || "";
      
      // Extract Grounding Metadata URLs
      const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
      if (chunks) {
          chunks.forEach(chunk => {
              if (chunk.web?.uri) {
                  allGroundingUrls.add(chunk.web.uri);
              }
          });
      }

      // Parse JSON
      const jsonMatch = text.match(/```json\s*([\s\S]*?)\s*```/);
      let parsedLeads: any[] = [];
      
      if (jsonMatch && jsonMatch[1]) {
        try {
          parsedLeads = JSON.parse(jsonMatch[1]);
        } catch (e) {
          console.error("Failed to parse JSON batch", e);
        }
      } else {
        const arrayMatch = text.match(/\[\s*\{[\s\S]*\}\s*\]/);
        if (arrayMatch) {
           try {
              parsedLeads = JSON.parse(arrayMatch[0]);
           } catch (e) {}
        }
      }

      // Map and Filter Duplicates (against global exclude list and current batch)
      const newLeads: Lead[] = [];
      
      for (const item of parsedLeads) {
        // Simple normalization for duplicate check
        const normalizedName = item.name?.toLowerCase().trim();
        
        // Skip if we already have this name in our exclusion list (which includes previous batches)
        if (!normalizedName || currentExcludeList.some(ex => ex.toLowerCase().trim() === normalizedName)) {
            continue;
        }
        
        // Double check against current batch result duplicates
        if (newLeads.some(l => l.name.toLowerCase().trim() === normalizedName)) {
            continue;
        }

        newLeads.push({
          id: `lead-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          name: item.name || "Unknown Business",
          address: item.address || "No Address Found",
          phoneNumber: item.phoneNumber || "N/A",
          website: item.website || "N/A",
          rating: item.rating || 0,
          reviewCount: item.reviewCount || 0,
          category: item.category || "General",
          latitude: item.latitude,
          longitude: item.longitude,
          socialProfiles: {
            facebook: item.socialProfiles?.facebook || "",
            instagram: item.socialProfiles?.instagram || "",
            linkedin: item.socialProfiles?.linkedin || "",
            twitter: item.socialProfiles?.twitter || ""
          }
        });
      }

      if (newLeads.length === 0) {
        // If the model returned valid JSON but 0 new leads, break to avoid infinite loops
        break;
      }

      // Update lists
      allLeads.push(...newLeads);
      currentExcludeList.push(...newLeads.map(l => l.name));

      // Notify UI immediately about new leads
      if (onBatchResults) {
        onBatchResults(newLeads);
      }
      
      // Safety break if we can't find enough or if we found fewer than expected repeatedly
      // For now, we rely on the while loop.
    }

    return { leads: allLeads, groundingUrls: Array.from(allGroundingUrls) };

  } catch (error: any) {
    if (signal?.aborted) {
        return { leads: allLeads, groundingUrls: Array.from(allGroundingUrls) };
    }
    console.error("Gemini Search Error:", error);
    throw error;
  }
};

export const generatePersonalizedMessage = async (
  lead: Lead,
  templateContent: string,
  companyName: string = "AXA Pakistan Company"
): Promise<string> => {
  try {
    const modelId = "gemini-2.5-flash";
    
    const prompt = `
      Role: You are a top-tier B2B Sales Representative for "${companyName}".
      Task: Write a personalized, high-converting WhatsApp outreach message to a potential client.
      
      Client Details:
      - Business Name: "${lead.name}"
      - Address: "${lead.address}"
      - Rating: ${lead.rating} stars (${lead.reviewCount} reviews)
      - Category: "${lead.category}"
      
      Instructions:
      1. Use the following TEMPLATE content as the core offer and structure, but rewrite it to feel personally written for THIS specific business.
      2. Mention their business name naturally. 
      3. If they have a high rating (above 4.0), compliment them on it specifically.
      4. Keep the tone professional, polite, and engaging.
      5. Do NOT use placeholders (like {name}). Fill in all data.
      6. Output ONLY the message body text. No subject lines, no "Here is the message:".
      7. Use WhatsApp formatting if needed (*bold*, _italics_).
      
      TEMPLATE TO ADAPT:
      "${templateContent}"
    `;

    const response = await ai.models.generateContent({
      model: modelId,
      contents: prompt,
      config: {
        // Low temperature for consistent adherence to template structure but enough for variation
        temperature: 0.7, 
      }
    });

    return response.text ? response.text.trim() : templateContent;
  } catch (error) {
    console.error("AI Message Generation Error:", error);
    // Fallback to simple string replacement if AI fails
    let msg = templateContent;
    msg = msg.replace(/{name}/g, lead.name);
    msg = msg.replace(/{address}/g, lead.address);
    msg = msg.replace(/{phoneNumber}/g, lead.phoneNumber);
    msg = msg.replace(/{rating}/g, String(lead.rating));
    return msg;
  }
};