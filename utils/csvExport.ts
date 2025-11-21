import { Lead } from "../types";

export const exportToCSV = (leads: Lead[], filename: string) => {
  if (!leads || leads.length === 0) return;

  const headers = [
    "Business Name",
    "Address",
    "Phone Number",
    "Website",
    "Rating",
    "Review Count",
    "Category",
    "Latitude",
    "Longitude",
    "Facebook",
    "Instagram",
    "LinkedIn",
    "Twitter"
  ];

  const rows = leads.map(lead => [
    `"${lead.name.replace(/"/g, '""')}"`, // Escape quotes
    `"${lead.address.replace(/"/g, '""')}"`,
    `"${lead.phoneNumber}"`,
    `"${lead.website}"`,
    lead.rating,
    lead.reviewCount,
    `"${lead.category}"`,
    lead.latitude || "",
    lead.longitude || "",
    lead.socialProfiles?.facebook || "",
    lead.socialProfiles?.instagram || "",
    lead.socialProfiles?.linkedin || "",
    lead.socialProfiles?.twitter || ""
  ]);

  const csvContent = [
    headers.join(","),
    ...rows.map(row => row.join(","))
  ].join("\n");

  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  
  if (link.download !== undefined) {
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `${filename}.csv`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
};

export const exportCampaignToCSV = (leads: Lead[], generatedMessages: Record<string, string>, filename: string) => {
  if (!leads || leads.length === 0) return;

  const headers = [
    "Business Name",
    "Address",
    "Phone Number",
    "Website",
    "Rating",
    "Review Count",
    "Category",
    "Latitude",
    "Longitude",
    "Facebook",
    "Instagram",
    "LinkedIn",
    "Twitter",
    "AI Generated Message",
    "WhatsApp Link"
  ];

  const rows = leads.map(lead => {
    const message = generatedMessages[lead.id] || "";
    let cleanNumber = lead.phoneNumber.replace(/\D/g, '');
    // Standardize to international format for the link
    if (cleanNumber.startsWith('03')) {
        cleanNumber = '92' + cleanNumber.substring(1);
    } else if (cleanNumber.startsWith('92')) {
        // already correct prefix
    }
    
    // Only generate link if we have a phone number and a message (optional, but safer)
    const whatsappLink = (cleanNumber) 
        ? `https://wa.me/${cleanNumber}?text=${encodeURIComponent(message)}` 
        : "";

    return [
        `"${lead.name.replace(/"/g, '""')}"`,
        `"${lead.address.replace(/"/g, '""')}"`,
        `"${lead.phoneNumber}"`,
        `"${lead.website}"`,
        lead.rating,
        lead.reviewCount,
        `"${lead.category}"`,
        lead.latitude || "",
        lead.longitude || "",
        lead.socialProfiles?.facebook || "",
        lead.socialProfiles?.instagram || "",
        lead.socialProfiles?.linkedin || "",
        lead.socialProfiles?.twitter || "",
        `"${message.replace(/"/g, '""')}"`, // Escape quotes in message
        `"${whatsappLink}"`
    ];
  });

  const csvContent = [
    headers.join(","),
    ...rows.map(row => row.join(","))
  ].join("\n");

  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  
  if (link.download !== undefined) {
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `${filename}.csv`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
};