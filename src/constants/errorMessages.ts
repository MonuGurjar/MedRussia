export const AppErrorMessages = {
  // 🌐 Network / Connectivity
  Network: {
    NO_INTERNET: "No internet connection — Please check your connection and try again.",
    CONNECTION_LOST: "Connection lost — Please check your internet connection.",
    SERVER_UNREACHABLE: "Unable to connect — Please try again in a moment.",
    REQUEST_TIMEOUT: "Request timed out — Please try again.",
    SERVER_ERROR: "Something went wrong — We're having trouble connecting to our servers.",
  },

  // 🔐 Login / Authentication (Anti-Enumeration Guard)
  Auth: {
    INVALID_CREDENTIALS: "Invalid email or password — Please check your credentials and try again.",
    EMAIL_NOT_VERIFIED: "Email not verified — Please verify your email before signing in.",
    ACCOUNT_DISABLED: "Account unavailable — This account is currently unavailable.",
    SESSION_EXPIRED: "Session expired — Please sign in again.",
    ALREADY_LOGGED_IN: "You're already signed in.",
  },

  // 📝 Registration
  Registration: {
    ACCOUNT_EXISTS: "Account already exists — Try signing in instead.",
    INVALID_EMAIL: "Enter a valid email address.",
    WEAK_PASSWORD: "Password is too weak — Use at least 8 characters.",
    PASSWORD_MISMATCH: "Passwords don't match — Please try again.",
    REQUIRED_FIELD: "This field is required.",
    INVALID_PHONE: "Enter a valid phone number.",
    REGISTRATION_FAILED: "Couldn't create your account — Please try again.",
  },

  // 📁 Documents / KYC
  Documents: {
    UPLOAD_FAILED: "Upload failed — Please try again.",
    FILE_TOO_LARGE: "File is too large — Please choose a smaller file (Max 10MB).",
    UNSUPPORTED_FORMAT: "Unsupported file type — Please select a PDF, JPG, or PNG.",
    PERMISSION_DENIED: "Unable to access this document.",
    DOWNLOAD_FAILED: "Couldn't download the document — Please try again.",
    DOCUMENT_MISSING: "Document unavailable — It may have been removed or moved.",
  },

  // 🎓 Application
  Application: {
    SAVE_FAILED: "Couldn't save your changes — Please try again.",
    APPLICATION_UNAVAILABLE: "Application unavailable — Please try again later.",
    UNAUTHORIZED: "You don't have permission to perform this action.",
    ALREADY_SUBMITTED: "Application already submitted.",
    INVALID_DATA: "Some information is invalid — Please review your details.",
  },

  // 🤖 AI Counselor
  AiCounselor: {
    AI_UNAVAILABLE: "AI counselor is temporarily unavailable — Please try again later.",
    AI_TIMEOUT: "The response took too long — Please try again.",
    AI_REQUEST_FAILED: "Couldn't get a response — Please try again.",
    RATE_LIMITED: "Too many requests — Please wait a moment and try again.",
    EMPTY_RESPONSE: "No response received — Please try asking again.",
  },
};
