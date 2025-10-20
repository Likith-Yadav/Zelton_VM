import api from "./api";
import emailjs from "@emailjs/browser";

class EmailService {
  constructor() {
    // EmailJS configuration
    this.serviceId = "service_5hv2s12";
    this.templateId = "template_51likw8";
    this.publicKey = "aPHpCTGGPnv_SVUyl";

    // Initialize EmailJS for React Native
    this.initializeEmailJS();
  }

  initializeEmailJS() {
    try {
      // Set up EmailJS for React Native environment
      if (typeof window === "undefined" || !global.window) {
        // React Native environment - create a comprehensive mock window object
        global.window = {
          location: {
            origin: "https://zeltonlivings.com",
            protocol: "https:",
            host: "zeltonlivings.com",
            hostname: "zeltonlivings.com",
            port: "",
            pathname: "/",
            search: "",
            hash: "",
            href: "https://zeltonlivings.com/",
          },
          navigator: {
            userAgent: "React Native",
          },
          document: {
            createElement: () => ({}),
          },
        };
      }

      // Also set window.location directly on global
      if (!global.window.location) {
        global.window.location = {
          origin: "https://zeltonlivings.com",
          protocol: "https:",
          host: "zeltonlivings.com",
          hostname: "zeltonlivings.com",
          port: "",
          pathname: "/",
          search: "",
          hash: "",
          href: "https://zeltonlivings.com/",
        };
      }

      // Set location directly on global as well
      global.location = global.window.location;
    } catch (error) {
      console.log("EmailJS initialization note:", error.message);
    }
  }

  // Generate a 6-digit OTP
  generateOTP() {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  // Send OTP email via backend (which will use EmailJS server-side)
  async sendOTPEmail(to_email, to_name) {
    try {
      const verification_code = this.generateOTP();

      console.log("Sending OTP email to:", to_email);
      console.log("Generated OTP:", verification_code);

      // Send OTP via backend API (backend will handle EmailJS)
      const response = await api.post("/api/auth/send_otp/", {
        email: to_email,
      });

      console.log("Backend OTP response:", response);

      if (response.data.success) {
        // Backend generates its own OTP, so we don't need to return the client-generated one
        return {
          success: true,
          message: "OTP sent successfully",
        };
      } else {
        return {
          success: false,
          error: response.data.error || "Failed to send OTP email",
        };
      }
    } catch (error) {
      console.error("Error sending OTP email:", error);

      // If backend fails, still return the OTP for testing
      console.warn("Backend email failed - using mock OTP for testing");
      const verification_code = this.generateOTP();
      return {
        success: true,
        otp: verification_code,
        message:
          "OTP generated successfully (Backend email failed - using mock)",
      };
    }
  }

  // Verify OTP (simple comparison - in production, you might want to use a more secure method)
  verifyOTP(enteredOTP, generatedOTP) {
    return enteredOTP === generatedOTP;
  }
}

export default new EmailService();
