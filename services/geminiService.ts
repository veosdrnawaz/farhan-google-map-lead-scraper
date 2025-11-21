import { Lead } from "../types";

// Configuration for OpenRouter / Grok
const API_KEY = "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";
const MODEL = "x-ai/grok-4.1-fast";

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Wraps an async operation with exponential backoff retry logic.
 */
async function retryWithBackoff<T>(
  operation: () => Promise<T>,
  retries = 3,
  baseDelay = 2000
): Promise<T> {
  try {
    return await operation();
  } catch (error: any) {
    const msg = error?.toString().toLowerCase();
    const isRateLimit = msg.includes('429') || msg.includes('rate limit') || error?.status === 429;

    if (retries > 0 && isRateLimit) {
      console.warn(`Rate limit hit. Retrying in ${baseDelay}ms...`);
      await delay(baseDelay);
      return retryWithBackoff(operation, retries - 1, baseDelay * 2);
    }
    throw error;
  }
}

/**
 * Helper function to call OpenRouter API
 */
async function callGrokAPI(messages: any[]) {
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
            "Authorization": `Bearer ${API_KEY}`,
            "HTTP-Referer": typeof window !== 'undefined' ? window.location.href : "https://leadscout.ai",
            "X-Title": "LeadScout AI",
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            model: MODEL,
            messages: messages,
            temperature: 0.7,
            response_format: { type: "json_object" } // Grok supports JSON mode
        })
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`Grok API Error ${response.status}: ${errorData.error?.message || response.statusText}`);
    }

    return await response.json();
}

export const searchLeads = async (
  keyword: string, 
  city: string, 
  limit: number,
  excludeNames: string[] = [],
  onBatchResults?: (leads: Lead[]) => void,
  signal?: AbortSignal
): Promise<{ leads: Lead[]; groundingUrls: string[] }> => {
  const allLeads: Lead[] = [];
  // Note: Grounding URLs are specific to Google Gemini Maps tool. 
  // Grok does not return structured map source URLs, so this will be empty.
  const groundingUrls: string[] = []; 
  let currentExcludeList = [...excludeNames];
  
  const BATCH_SIZE = 10; // Smaller batch size for better accuracy with text-only models

  try {
    while (allLeads.length < limit) {
      if (signal?.aborted) {
          console.log("Search aborted by user");
          break;
      }

      const remaining = limit - allLeads.length;
      const batchTarget = Math.min(remaining, BATCH_SIZE);
      
      const excludeString = currentExcludeList.length > 0 
        ? `\nIMPORTANT: DO NOT include any of these businesses: ${JSON.stringify(currentExcludeList.slice(-50))}. Find DIFFERENT ones.` 
        : "";

      const systemPrompt = `You are an expert lead generation tool. 
      Your task is to generate real, existing business leads for the user's query.
      Return data in STRICT JSON format.
      
      Output Structure:
      {
        "leads": [
          {
            "name": "Business Name",
            "address": "Full Address including City",
            "phoneNumber": "Phone Number (Local format preferred)",
            "website": "Website URL or 'N/A'",
            "rating": 4.5,
            "reviewCount": 100,
            "category": "Category",
            "socialProfiles": {
               "facebook": "",
               "instagram": "",
               "linkedin": "",
               "twitter": ""
            }
          }
        ]
      }`;

      const userPrompt = `Find ${batchTarget} distinct businesses for "${keyword}" in "${city}".
      ${excludeString}
      Ensure the phone numbers are valid for the region.`;

      // Use retryWithBackoff for search requests
      const data = await retryWithBackoff(async () => {
          const result = await callGrokAPI([
              { role: "system", content: systemPrompt },
              { role: "user", content: userPrompt }
          ]);
          return result;
      });

      if (signal?.aborted) break;

      const text = data.choices?.[0]?.message?.content || "";
      
      // Parse JSON
      let parsedLeads: any[] = [];
      try {
        // Try to parse the whole text first
        const json = JSON.parse(text);
        if (json.leads && Array.isArray(json.leads)) {
            parsedLeads = json.leads;
        } else if (Array.isArray(json)) {
            parsedLeads = json;
        }
      } catch (e) {
         // Fallback regex extraction
         const jsonMatch = text.match(/\{[\s\S]*\}/);
         if (jsonMatch) {
            try {
                const json = JSON.parse(jsonMatch[0]);
                parsedLeads = json.leads || json;
            } catch (err) { console.error("JSON Parse Error", err); }
         }
      }

      // Map and Filter Duplicates
      const newLeads: Lead[] = [];
      
      if (Array.isArray(parsedLeads)) {
          for (const item of parsedLeads) {
            const normalizedName = item.name?.toLowerCase().trim();
            
            if (!normalizedName || currentExcludeList.some(ex => ex.toLowerCase().trim() === normalizedName)) {
                continue;
            }
            if (newLeads.some(l => l.name.toLowerCase().trim() === normalizedName)) {
                continue;
            }

            newLeads.push({
              id: `lead-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
              name: item.name || "Unknown Business",
              address: item.address || `${city} Area`,
              phoneNumber: item.phoneNumber || "N/A",
              website: item.website || "N/A",
              rating: typeof item.rating === 'number' ? item.rating : 0,
              reviewCount: typeof item.reviewCount === 'number' ? item.reviewCount : 0,
              category: item.category || "General",
              latitude: undefined, // Not available without Maps tool
              longitude: undefined, // Not available without Maps tool
              socialProfiles: {
                facebook: item.socialProfiles?.facebook || "",
                instagram: item.socialProfiles?.instagram || "",
                linkedin: item.socialProfiles?.linkedin || "",
                twitter: item.socialProfiles?.twitter || ""
              }
            });
          }
      }

      if (newLeads.length === 0) {
        break;
      }

      allLeads.push(...newLeads);
      currentExcludeList.push(...newLeads.map(l => l.name));

      if (onBatchResults) {
        onBatchResults(newLeads);
      }
      
      // Small delay to be polite to the API
      await delay(1000);
    }

    return { leads: allLeads, groundingUrls };

  } catch (error: any) {
    if (signal?.aborted) {
        return { leads: allLeads, groundingUrls };
    }
    console.error("Grok Search Error:", error);
    throw error;
  }
};

export const generatePersonalizedMessage = async (
  lead: Lead,
  templateContent: string,
  companyName: string = "AXA Pakistan Company"
): Promise<string> => {
  try {
    const systemPrompt = `You are a top-tier B2B Sales Representative for "${companyName}".
    Your task is to rewrite a template into a personalized WhatsApp message for a specific client.
    Output ONLY the message text. No subject lines.`;

    const userPrompt = `
      Client: "${lead.name}"
      Address: "${lead.address}"
      Rating: ${lead.rating} stars
      Category: "${lead.category}"
      
      Template to adapt:
      "${templateContent}"
      
      Instructions:
      1. Mention their business name naturally.
      2. Compliment their rating if > 4.0.
      3. Keep placeholders {name}, {address}, {rating} etc FILLED with the data provided above.
      4. Keep it professional and polite.
    `;

    const data = await retryWithBackoff(() => callGrokAPI([
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
    ]));

    return data.choices?.[0]?.message?.content?.trim() || templateContent;

  } catch (error) {
    console.error("AI Message Generation Error:", error);
    let msg = templateContent;
    msg = msg.replace(/{name}/g, lead.name);
    msg = msg.replace(/{address}/g, lead.address);
    msg = msg.replace(/{phoneNumber}/g, lead.phoneNumber);
    return msg;
  }
};

export const rewriteTemplate = async (currentContent: string): Promise<string> => {
    try {
        const systemPrompt = "You are a world-class copywriter. Rewrite the given WhatsApp marketing template to be more professional and persuasive.";
        const userPrompt = `
            Current Template:
            "${currentContent}"

            Rules:
            - Keep all placeholders like {name}, {address}, {phoneNumber} exactly as they are.
            - Output ONLY the rewritten template text.
        `;

        const data = await retryWithBackoff(() => callGrokAPI([
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt }
        ]));
        
        return data.choices?.[0]?.message?.content?.trim() || currentContent;
    } catch (error) {
        console.error("Template Rewrite Error:", error);
        throw error;
    }
};