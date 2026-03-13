# Inbox Lite Database Schema

This schema defines the minimal data model required for operational messaging.

---

# contacts

Represents a person interacting via WhatsApp.

Fields

id  
phone (unique normalized phone number)  
name  
avatar_url  
created_at  
updated_at

---

# conversations

Represents a chat thread.

Fields

id  
external_chat_id  
contact_id  
instance_id  
channel  
status  
ai_enabled  
last_message_at  
last_message_preview  
unread_count  
created_at  
updated_at

Status values

new  
ai_active  
waiting_customer  
needs_human  
human_active  
closed

---

# messages

Represents a message event.

Fields

id  
external_message_id (unique)  
conversation_id  
contact_id  
direction (inbound | outbound)  
sender_type (customer | ai | human | system)  
message_type (text | image | audio | video | document)  
text_content  
media_id  
status  
external_timestamp  
created_at  
updated_at

Message status

received  
queued  
sent  
delivered  
read  
failed

---

# media_assets

Stores media metadata.

Fields

id  
message_id  
storage_provider  
storage_path  
public_url  
mime_type  
file_size  
created_at

---

# conversation_ai_state

Stores AI context for each conversation.

Fields

conversation_id  
ai_enabled  
current_intent  
intent_confidence  
lead_temperature  
ai_message_count  
customer_message_count  
needs_human  
updated_at

---

# Critical Constraints

external_message_id must be unique.

phone must be normalized.

conversation_id must exist before storing messages.