import { useLanguage } from "@/contexts/LanguageContext";
import { Link, useLocation } from "react-router-dom";
import { Facebook, Twitter, Instagram, Youtube, Linkedin } from "lucide-react";
import { TextHoverEffect } from "@/components/ui/text-hover-effect";

const footerLinks = [
  {
    title: { en: "Get to Know Us", ar: "تعرف علينا" },
    links: [
      { name: { en: "About Benna", ar: "عن بنّة" }, href: "/about" },
      { name: { en: "Why Benna", ar: "لماذا بنّة" }, href: "/why-benna" },
      {
        name: { en: "Privacy Policy", ar: "سياسة الخصوصية" },
        href: "/privacy-policy",
      },
      {
        name: { en: "Terms of Use", ar: "شروط الاستخدام" },
        href: "/terms-of-use",
      },
      {
        name: { en: "Benna Certificates", ar: "شهادات بنّة" },
        href: "/certificates",
      },
    ],
  },
  {
    title: { en: "Shop With Us", ar: "تسوق معنا" },
    links: [
      {
        name: { en: "Terms of Sale", ar: "شروط البيع" },
        href: "/terms-of-sale",
      },
      { name: { en: "Benna Brands", ar: "ماركات بنّة" }, href: "/brands" },
      { name: { en: "Benna Products", ar: "منتجات بنّة" }, href: "/products" },
      {
        name: { en: "Benna Categories", ar: "فئات بنّة" },
        href: "/categories",
      },
    ],
  },
  {
    title: { en: "Make Money With Us", ar: "اكسب معنا" },
    links: [
      { name: { en: "Sell On Benna", ar: "بيع على بنّة" }, href: "/sell" },
      { name: { en: "Supply To Benna", ar: "التوريد لبنّة" }, href: "/supply" },
      {
        name: { en: "Fulfillment By Benna", ar: "التنفيذ بواسطة بنّة" },
        href: "/fulfillment",
      },
      {
        name: { en: "Advertise Your Products", ar: "إعلان منتجاتك" },
        href: "/advertise",
      },
    ],
  },
  {
    title: { en: "Let Us Help You", ar: "دعنا نساعدك" },
    links: [
      { name: { en: "Track Order", ar: "تتبع الطلب" }, href: "/track-order" },
      { name: { en: "FAQs", ar: "الأسئلة الشائعة" }, href: "/faqs" },
      {
        name: { en: "Materials Answers", ar: "أسئلة وأجوبة المواد" },
        href: "/answers",
      },
      {
        name: { en: "Arabic Materials Guide", ar: "مواد البناء بالعربية" },
        href: "/ar",
      },
      {
        name: { en: "Knowledge Graph", ar: "قاعدة المعرفة" },
        href: "/knowledge",
      },
      { name: { en: "Contact Us", ar: "اتصل بنا" }, href: "/contact" },
      { name: { en: "Connect AI Assistant", ar: "ربط مساعد الذكاء الاصطناعي" }, href: "/connect" },
      {
        name: { en: "Warranty Policy", ar: "سياسة الضمان" },
        href: "/warranty-policy",
      },
    ],
  },
  {
    title: { en: "Cost Calculators", ar: "حاسبات التكلفة" },
    links: [
      {
        name: { en: "Ready Mix Calculator", ar: "حاسبة الخرسانة الجاهزة" },
        href: "/calculators",
      },
      {
        name: { en: "Construction Cost Calculator", ar: "حاسبة تكلفة البناء" },
        href: "/calculators/construction-cost",
      },
      {
        name: {
          en: "Raw Material For Construction",
          ar: "المواد الخام للبناء",
        },
        href: "/calculators/raw-materials",
      },
      {
        name: { en: "Paint Calculator", ar: "حاسبة الدهانات" },
        href: "/calculators/paint",
      },
      {
        name: { en: "Explore All Calculators", ar: "استكشف جميع الحاسبات" },
        href: "/calculators/all",
      },
    ],
  },
  {
    title: { en: "Benna Platform", ar: "منصة بنّة" },
    links: [
      { name: { en: "Benna AI", ar: "بناء الذكي" }, href: "/assistant" },
      { name: { en: "AI BOQ", ar: "كمية الأعمال الذكية" }, href: "/build-project" },
      { name: { en: "RFQ Marketplace", ar: "سوق طلبات العروض" }, href: "/rfqs" },
      { name: { en: "Vendor Marketplace", ar: "سوق الموردين" }, href: "/sell" },
      { name: { en: "Compare Products", ar: "قارن المنتجات" }, href: "/compare" },
      { name: { en: "Wishlist", ar: "قائمة الأمنيات" }, href: "/account/wishlist" },
      { name: { en: "Deals", ar: "العروض" }, href: "/deals" },
    ],
  },
];

const paymentMethods = [
  "Mada",
  "Visa",
  "Mastercard",
  "Sadad",
  "Apple Pay",
  "PayTabs",
  "SAB",
  "IFS",
  "gopay",
  "nsbh",
  "CR",
  "VAT",
  "SPL",
];

const Footer = () => {
  const { language, isRTL } = useLanguage();
  const location = useLocation();

  const handleLogoClick = (e: React.MouseEvent) => {
    if (location.pathname === "/") {
      e.preventDefault();
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const getText = (textObj: any) => {
    return textObj && typeof textObj === "object"
      ? textObj[language] || textObj.en
      : textObj;
  };

  return (
    <footer className="footer-section" dir={isRTL ? "rtl" : "ltr"}>
      <div className="bg-[#f8fafd] border-b border-[#d8d6df]/30 py-3 lg:py-4">
        <div className="w-full px-4 sm:px-6 lg:px-8 xl:px-12 2xl:px-16">
          <button
            onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
            className="text-xs sm:text-sm text-center text-[#50617a] w-full cursor-pointer hover:text-[#533afd] transition-colors w-full"
          >
            {language === "en" ? "Back to top" : "العودة للأعلى"}
          </button>
        </div>
      </div>
      {/* Main Footer */}
      <div className="w-full px-4 sm:px-6 lg:px-8 xl:px-12 2xl:px-16 py-8 lg:py-12">
        {/* Top Row: Logo + App Badges */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-8 lg:mb-10 w-full">
          {/* Logo */}
          <a
            href="/"
            onClick={handleLogoClick}
            className="flex items-center gap-1"
          >
            <img
              src="https://static.wixstatic.com/media/b99a57_66162956ac1345b7b402744d22076d87~mv2.png/v1/fit/w_320,h_128,q_80,enc_avif/image.avif"
              alt="Benna logo"
              width={160}
              height={63}
              loading="lazy"
              decoding="async"
              className="h-10 sm:h-12 lg:h-14 xl:h-16 w-auto"
            />
          </a>

          {/* App Download Badges */}
          <div className="flex items-center gap-3 sm:gap-4">
            <a
              href="https://play.google.com/store/apps/details?id=benna.ksa.com.app"
              className="inline-block hover:opacity-80 transition-opacity"
              aria-label="Download on Google Play"
            >
              <img
                src="https://static.wixstatic.com/media/a3b8d7_cf19eb43e85f493aa7dd2060e7bed1aa~mv2.png"
                alt="Get it on Google Play"
                className="h-11 sm:h-12 lg:h-14 w-auto"
              />
            </a>
            <a
              href="https://apps.apple.com/sa/app/benna-%D8%A8%D9%86%D8%A7%D8%A1/id6763252606"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block hover:opacity-80 transition-opacity"
              aria-label="Download on App Store"
            >
              <img
                src="https://static.wixstatic.com/shapes/a3b8d7_8ed3aae73ef9433598da0de7e90391d9.svg"
                alt="Download on the App Store"
                className="h-11 sm:h-12 lg:h-14 w-auto"
              />
            </a>
          </div>
        </div>

        {/* Links Row */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-6 gap-4 sm:gap-6 lg:gap-6 xl:gap-8 w-full">
          {footerLinks.map((section, index) => (
            <div key={index} className="min-w-0">
              <h3 className="font-semibold text-gray-900 text-sm sm:text-base mb-3 lg:mb-4">
                {getText(section.title)}
              </h3>
              <ul className="space-y-1.5 sm:space-y-2">
                {section.links.map((link, linkIndex) => (
                  <li key={linkIndex}>
                    {link.href.startsWith("/") ? (
                      <Link
                        to={link.href}
                        className="text-xs sm:text-sm text-gray-600 hover:text-gray-900 transition-colors truncate block"
                      >
                        {getText(link.name)}
                      </Link>
                    ) : (
                      <a
                        href={link.href}
                        className="text-xs sm:text-sm text-gray-600 hover:text-gray-900 transition-colors truncate block"
                      >
                        {getText(link.name)}
                      </a>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Payment Methods & Social */}
        <div className="border-t border-gray-200 mt-6 lg:mt-8 pt-6 lg:pt-8 w-full">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 sm:gap-6">
            {/* Payment Methods */}
            <div className="flex flex-col sm:flex-row items-center gap-3 sm:gap-4 flex-wrap justify-center">
              <span className="text-xs sm:text-sm text-gray-600 whitespace-nowrap">
                {language === "en"
                  ? "© 2026 Benna. All Rights Reserved"
                  : "© 2026 بنّة. جميع الحقوق محفوظة"}
              </span>
              <div className="flex items-center gap-2 flex-wrap justify-center">
                {paymentMethods.map((method) => (
                  <div
                    key={method}
                    className="px-2 sm:px-3 py-1.5 sm:py-2 bg-gray-50 border border-gray-200 rounded flex items-center justify-center"
                    title={method}
                  >
                    {method === "Visa" && (
                      <img
                        src="https://static.wixstatic.com/media/b99a57_8325709bba1a426f88c313c0fcd6de69~mv2.png"
                        alt="Visa"
                        className="w-6 h-3 sm:w-8 sm:h-4 object-contain"
                      />
                    )}
                    {method === "Mastercard" && (
                      <img
                        src="https://static.wixstatic.com/shapes/b99a57_beef98af55144635bb9705b039a0011e.svg"
                        alt="Mastercard"
                        className="w-6 h-3.5 sm:w-8 sm:h-5 object-contain"
                      />
                    )}
                    {method === "Mada" && (
                      <img
                        src="https://static.wixstatic.com/shapes/b99a57_31cbd43722894cc5ba5180d2f4af12b7.svg"
                        alt="Mada"
                        className="w-6 h-3.5 sm:w-8 sm:h-5 object-contain"
                      />
                    )}
                    {method === "Sadad" && (
                      <img
                        src="https://static.wixstatic.com/media/b99a57_2aec326ccc484b72b9b85bc2ce301bd0~mv2.png"
                        alt="Sadad"
                        className="w-6 h-3.5 sm:w-8 sm:h-5 object-contain"
                      />
                    )}
                    {method === "Apple Pay" && (
                      <img
                        src="https://static.wixstatic.com/shapes/b99a57_0bf0a722401c4214a6a689814fed8e36.svg"
                        alt="Apple Pay"
                        className="w-6 h-3.5 sm:w-8 sm:h-5 object-contain"
                      />
                    )}
                    {method === "PayTabs" && (
                      <img
                        src="https://ms.hsoubcdn.com/uploads/thumbnails/2161724/64b700dbd8c17/Logoverticalenglishlogo1500x1500.png"
                        alt="PayTabs"
                        className="w-6 h-3.5 sm:w-8 sm:h-5 object-contain"
                      />
                    )}
                    {method === "SAB" && (
                      <img
                        src="https://static.wixstatic.com/media/b99a57_0bec39d1ffa1451db8a7b68d28c7e538~mv2.png"
                        alt="SAB"
                        className="w-6 h-3.5 sm:w-8 sm:h-5 object-contain"
                      />
                    )}
                    {method === "IFS" && (
                      <img
                        src="https://i0.wp.com/ifs.sa/wp-content/uploads/2022/10/Fullcolor-version-En.png?fit=7195%2C1883&ssl=1"
                        alt="IFS"
                        className="w-6 h-3.5 sm:w-8 sm:h-5 object-contain"
                      />
                    )}
                    {method === "gopay" && (
                      <img
                        src="https://app.gopay.sa/wbiller/assets/images/LogoIcon.png"
                        alt="Gopay"
                        className="w-6 h-3.5 sm:w-8 sm:h-5 object-contain"
                      />
                    )}
                    {method === "nsbh" && (
                      <img
                        src="https://www.qoyod.com/wp-content/uploads/2026/04/nsbh_logo.png"
                        alt="nsbh"
                        className="w-6 h-3.5 sm:w-8 sm:h-5 object-contain"
                      />
                    )}
                    {method === "CR" && (
                      <img
                        src="https://jkmanagement.ae/wp-content/uploads/2025/01/Logo_Ministry_of_Commerce.svg-1024x384.png"
                        alt="Commercial Registration"
                        className="w-6 h-3.5 sm:w-8 sm:h-5 object-contain"
                      />
                    )}
                    {method === "VAT" && (
                      <img
                        src="https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQNGr2mfichSpb9VNRk4AN46l35yDskLLU8bw&s"
                        alt="VAT"
                        className="w-6 h-3.5 sm:w-8 sm:h-5 object-contain"
                      />
                    )}
                    {method === "SPL" && (
                      <img
                        src="https://media.licdn.com/dms/image/v2/C4D12AQFthL0jaxEfdA/article-cover_image-shrink_600_2000/article-cover_image-shrink_600_2000/0/1631288448037?e=2147483647&v=beta&t=OcMryeIlIToo5M9X0vdjBv-k2ZMdBrat7Ktz1COxneg"
                        alt="SPL"
                        className="w-6 h-3.5 sm:w-8 sm:h-5 object-contain"
                      />
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Social Links */}
            <div className="flex items-center gap-3 sm:gap-4">
              <span className="text-xs sm:text-sm text-gray-600 whitespace-nowrap">
                {language === "en" ? "Follow us:" : "تابعنا:"}
              </span>
              <div className="flex gap-2 sm:gap-3">
                <a
                  href="https://www.facebook.com/profile.php?id=61579625979584&mibextid=wwXIfr&rdid=1uwVv3qauXF2kGQJ&share_url=https%3A%2F%2Fwww.facebook.com%2Fshare%2F16iRWsjWHR%2F%3Fmibextid%3DwwXIfr#"
                  className="text-gray-600 hover:text-gray-900 transition-colors"
                  aria-label={language === "en" ? "Facebook" : "فيسبوك"}
                >
                  <Facebook className="w-4 h-4 sm:w-5 sm:h-5" />
                </a>
                <a
                  href="https://x.com/bennaksa?s=11"
                  className="text-gray-600 hover:text-gray-900 transition-colors"
                  aria-label={language === "en" ? "Twitter" : "تويتر"}
                >
                  <Twitter className="w-4 h-4 sm:w-5 sm:h-5" />
                </a>
                <a
                  href="https://www.instagram.com/bennaksa?igsh=MXAzaHhiZmdiaHdhcA%3D%3D"
                  className="text-gray-600 hover:text-gray-900 transition-colors"
                  aria-label={language === "en" ? "Instagram" : "إنستغرام"}
                >
                  <Instagram className="w-4 h-4 sm:w-5 sm:h-5" />
                </a>
                <a
                  href="https://www.youtube.com/@BennaKSA"
                  className="text-gray-600 hover:text-gray-900 transition-colors"
                  aria-label={language === "en" ? "YouTube" : "يوتيوب"}
                >
                  <Youtube className="w-4 h-4 sm:w-5 sm:h-5" />
                </a>
                <a
                  href="https://www.linkedin.com/company/benna-sa/"
                  className="text-gray-600 hover:text-gray-900 transition-colors"
                  aria-label={language === "en" ? "LinkedIn" : "لينكدإن"}
                >
                  <Linkedin className="w-4 h-4 sm:w-5 sm:h-5" />
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* BENNA hover text */}
      <div className="hidden lg:flex h-[18rem] w-full items-end justify-center overflow-hidden -mb-10 -mt-6">
        <TextHoverEffect text="BENNA KSA" duration={0.2} className="w-full h-full" />
      </div>

      {/* Copyright */}
      <div className="bg-gray-900 text-white py-3 lg:py-4">
        <div className="w-full px-4 sm:px-6 lg:px-8 xl:px-12 2xl:px-16">
          <p className="text-xs sm:text-sm text-center text-gray-500 w-full">
            {language === "en"
              ? "Benna KSA | Building Platform - CR No. 7029882987 - VAT No. 310336295200003"
              : "بنّة السعودية | منصة بناء - السجل التجاري رقم 7029882987 - الرقم الضريبي 310336295200003"}
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
