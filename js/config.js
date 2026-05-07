// js/config.js
// Fill these after creating your Supabase project.
// Keep SUPABASE_ANON_KEY public. Do NOT put a service-role key here.
window.APP_CONFIG = {
  SUPABASE_URL: "https://onefxrqwcsdpjnjqpoov.supabase.co",
  SUPABASE_ANON_KEY: "sb_publishable_Ez63ebw3MfI8JYgZ1Jo2kw_EN0lMbiP",

  // Simple admin lock for the dashboard.
  // This hides the dashboard from normal students, but for serious security use Supabase Auth later.
  ADMIN_PASSWORD: "2608",

  SCHOOL_YEAR: "2026",
  TEMPLATE_PATH: "assets/template-background.png",

  // Coordinates for the final locked template.
  // These are tuned for the approved square template.
  POST_SIZE: 1080,
  PHOTO_BOX: { x: 95, y: 135, w: 435, h: 755 },
  TEXT: {
    nameAr: { x: 995, y: 440, maxWidth: 460, size: 56 },
    nameEn: { x: 1028, y: 515, maxWidth: 450, size: 48 },
    major: { x: 630, y: 660, maxWidth: 350, size: 35 },
    applyingToLogos: { x: 640, y: 775, w: 390, h: 170 }
  }
};
