-- Add WhatsApp share message template to agencies table
ALTER TABLE public.agencies
ADD COLUMN whatsapp_property_template text DEFAULT '🏠 *{transactionType} - {propertyType}*

📍 *{title}*
{address}

💰 Prix: {price}
{features}
{description}
📞 Contactez-nous pour plus d''informations !';