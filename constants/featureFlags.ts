// Feature Flags configuration
// Phone OTP requires SMS provider (e.g. Twilio / MessageBird) configured in Supabase Auth.
// Set to true once SMS credentials are provided.
export const FEATURE_FLAGS = {
  ENABLE_PHONE_OTP: false,
};
