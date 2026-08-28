import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import mockData from "./mockData.js";

/* ------------------------------------------------------------------ */
/* Img - smart image component with extension fallback + lightbox     */
/* ------------------------------------------------------------------ */

const EXT_CANDIDATES = ["jpg", "jpeg", "png", "webp", "avif", "gif"];

function Img({ src, alt = "", className = "", zoomable = false, fallbackText, ...rest }) {
  const hasExt = /\.(jpg|jpeg|png|webp|avif|gif|svg)$/i.test(src || "");
  const [extIdx, setExtIdx] = useState(0);
  const [failed, setFailed] = useState(false);
  const { open } = useLightbox();

  const resolvedSrc = hasExt ? src : `${src}.${EXT_CANDIDATES[extIdx]}`;

  const handleError = () => {
    if (hasExt) {
      setFailed(true);
      return;
    }
    if (extIdx < EXT_CANDIDATES.length - 1) {
      setExtIdx((i) => i + 1);
    } else {
      setFailed(true);
    }
  };

  if (failed) {
    return (
      <div
        className={`flex items-center justify-center bg-brand/5 text-brand/40 text-sm font-medium ${className}`}
        {...rest}
      >
        {fallbackText || "Hình ảnh đang cập nhật"}
      </div>
    );
  }

  return (
    <img
      src={resolvedSrc}
      alt={alt}
      onError={handleError}
      onClick={zoomable ? () => open(resolvedSrc) : undefined}
      className={`${className} ${zoomable ? "cursor-zoom-in" : ""}`}
      {...rest}
    />
  );
}

/* ------------------------------------------------------------------ */
/* Lightbox                                                             */
/* ------------------------------------------------------------------ */

const LightboxContext = createContext({ open: () => {}, close: () => {} });
const useLightbox = () => useContext(LightboxContext);

function LightboxProvider({ children }) {
  const [src, setSrc] = useState(null);

  const open = useCallback((s) => setSrc(s), []);
  const close = useCallback(() => setSrc(null), []);

  useEffect(() => {
    if (!src) return;
    const onKey = (e) => e.key === "Escape" && close();
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [src, close]);

  const value = useMemo(() => ({ open, close }), [open, close]);

  return (
    <LightboxContext.Provider value={value}>
      {children}
      {src && (
        <div
          className="fixed inset-0 z-[100] bg-black/70 flex items-center justify-center p-4 fade-in"
          onClick={close}
        >
          <button
            onClick={close}
            className="absolute top-5 right-5 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center text-xl"
            aria-label="Đóng"
          >
            <i className="fa-solid fa-xmark" />
          </button>
          <img
            src={src}
            alt=""
            className="max-w-full max-h-full object-contain rounded-lg"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </LightboxContext.Provider>
  );
}

/* ------------------------------------------------------------------ */
/* Section heading helper                                             */
/* ------------------------------------------------------------------ */

function SectionHeading({ title, marginBottom = "mb-10" }) {
  return (
    <div className={`flex flex-col items-center ${marginBottom}`}>
      <h2 className="font-serif text-3xl md:text-4xl font-bold text-center text-brand mb-3">
        {title}
      </h2>
      <span className="w-16 h-1 rounded-full bg-gold mt-2" />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* LeadForm                                                            */
/* ------------------------------------------------------------------ */

function LeadForm({ source, submitLabel = "Đăng ký nhận tư vấn", theme = "light" }) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [agreed, setAgreed] = useState(false);
  const [status, setStatus] = useState("idle");
  const [error, setError] = useState("");

  useEffect(() => {
    if (status !== "success") return;
    const t = setTimeout(() => {
      setStatus("idle");
      setName("");
      setPhone("");
      setAgreed(false);
    }, 5000);
    return () => clearTimeout(t);
  }, [status]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!name.trim()) {
      setError("Vui lòng nhập họ tên.");
      return;
    }
    if (!/^\d{9,11}$/.test(phone.trim())) {
      setError("Số điện thoại không hợp lệ.");
      return;
    }
    if (!agreed) {
      setError("Vui lòng đồng ý với chính sách bảo mật.");
      return;
    }

    setStatus("loading");
    try {
      await fetch("/api/lead", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectName: mockData.name,
          createdAt: new Date().toISOString(),
          name,
          phone,
          source,
        }),
      });
    } catch (_) {
      // Swallow network errors — UX always treats submit as success.
    }
    if (typeof window !== "undefined" && typeof window.fbq === "function") {
      window.fbq("track", "Lead");
    }
    setStatus("success");
  };

  const submitBg =
    theme === "gold"
      ? "bg-gold hover:bg-gold-dark text-brand"
      : "bg-brand hover:bg-brand-light text-white";

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <input
        type="text"
        placeholder="Họ và tên"
        value={name}
        onChange={(e) => setName(e.target.value)}
        className="w-full px-4 py-3 rounded-xl border border-brand/15 focus:border-gold outline-none text-brand placeholder:text-brand/40"
      />
      <input
        type="tel"
        placeholder="Số điện thoại"
        value={phone}
        onChange={(e) => setPhone(e.target.value)}
        className="w-full px-4 py-3 rounded-xl border border-brand/15 focus:border-gold outline-none text-brand placeholder:text-brand/40"
      />
      <label className="flex items-start gap-2 text-sm text-brand/70">
        <input
          type="checkbox"
          checked={agreed}
          onChange={(e) => setAgreed(e.target.checked)}
          className="mt-1"
        />
        <span>
          Tôi đồng ý với{" "}
          <a href="/chinh-sach-bao-mat.html" className="text-gold-dark underline">
            Chính sách bảo mật
          </a>{" "}
          của Solia.
        </span>
      </label>

      {error && <p className="text-sm text-red-600">{error}</p>}
      {status === "success" && (
        <p className="text-sm text-green-600 font-medium">
          Đăng ký thành công! Chuyên viên tư vấn sẽ liên hệ với bạn sớm nhất.
        </p>
      )}

      <button
        type="submit"
        disabled={status === "loading"}
        className={`w-full rounded-full py-3 font-semibold transition ${submitBg} disabled:opacity-60`}
      >
        {status === "loading" ? "Đang gửi..." : submitLabel}
      </button>
    </form>
  );
}

/* ------------------------------------------------------------------ */
/* Particles (canvas background for LeadFormSection)                  */
/* ------------------------------------------------------------------ */

function Particles() {
  const canvasRef = useRef(null);
  const wrapRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    if (!canvas || !wrap) return;
    const ctx = canvas.getContext("2d");
    let particles = [];
    let raf;

    const dpr = window.devicePixelRatio || 1;

    const makeParticles = (w, h) => {
      particles = Array.from({ length: 130 }, () => ({
        x: Math.random() * w,
        y: Math.random() * h,
        r: Math.random() * 1.6 + 0.4,
        vx: (Math.random() - 0.5) * 0.25,
        vy: (Math.random() - 0.5) * 0.25,
        o: Math.random() * 0.5 + 0.15,
      }));
    };

    const resize = () => {
      const w = wrap.clientWidth;
      const h = wrap.clientHeight;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      makeParticles(w, h);
    };

    const tick = () => {
      const w = wrap.clientWidth;
      const h = wrap.clientHeight;
      ctx.clearRect(0, 0, w, h);
      particles.forEach((p) => {
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < 0) p.x = w;
        if (p.x > w) p.x = 0;
        if (p.y < 0) p.y = h;
        if (p.y > h) p.y = 0;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255,255,255,${p.o})`;
        ctx.fill();
      });
      raf = requestAnimationFrame(tick);
    };

    resize();
    tick();

    const ro = new ResizeObserver(resize);
    ro.observe(wrap);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, []);

  return (
    <div ref={wrapRef} className="absolute inset-0 overflow-hidden pointer-events-none">
      <canvas ref={canvasRef} />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Header                                                              */
/* ------------------------------------------------------------------ */

function Header({ data, onOpenPopup }) {
  const [scrolled, setScrolled] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [hoverStyle, setHoverStyle] = useState({ opacity: 0 });
  const navRef = useRef(null);
  const lastY = useRef(0);

  const navItems = [
    { label: "Tổng quan", href: "#intro" },
    { label: "Vị trí", href: "#location" },
    { label: "Tiện ích", href: "#amenities" },
    { label: "Mặt bằng", href: "#floorplan" },
    { label: "Giá bán", href: "#pricing" },
    { label: "Liên hệ", href: "#contact" },
  ];

  useEffect(() => {
    const onScroll = () => {
      const y = window.scrollY;
      setScrolled(y > 80);
      if (y > lastY.current && y > 200) {
        setHidden(true);
      } else {
        setHidden(false);
      }
      lastY.current = y;
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const handleLinkMouseEnter = (e) => {
    if (!navRef.current) return;
    const linkRect = e.currentTarget.getBoundingClientRect();
    const navRect = navRef.current.getBoundingClientRect();
    setHoverStyle({
      opacity: 1,
      left: linkRect.left - navRect.left,
      width: linkRect.width,
    });
  };

  const handleNavMouseLeave = () => setHoverStyle((s) => ({ ...s, opacity: 0 }));

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled ? "bg-white shadow-md" : "bg-transparent"
      } ${hidden ? "-translate-y-full" : "translate-y-0"}`}
    >
      <div className="max-w-6xl mx-auto px-6 md:px-12 flex items-center justify-between h-20">
        <a href="#top" className={`transition-opacity duration-300 ${scrolled ? "opacity-100" : "opacity-0"}`}>
          <Img src={data.logo} alt={data.name} className="h-16 w-auto object-contain" />
        </a>

        <nav
          ref={navRef}
          className="relative hidden lg:flex items-center gap-6"
          onMouseLeave={handleNavMouseLeave}
        >
          <div
            className="absolute top-0 h-full rounded-full bg-brand/10 opacity-0 transition-[width,left,opacity] duration-300 pointer-events-none"
            style={hoverStyle}
          />
          {navItems.map((item) => (
            <a
              key={item.href}
              href={item.href}
              onMouseEnter={handleLinkMouseEnter}
              className={`relative z-10 px-3 py-2 text-sm font-medium transition-colors ${
                scrolled ? "text-brand hover:text-gold" : "text-white hover:text-gold"
              }`}
            >
              {item.label}
            </a>
          ))}
        </nav>

        <button
          type="button"
          onClick={onOpenPopup}
          className={`rounded-full bg-gold hover:bg-gold-dark text-brand text-sm font-semibold px-5 py-2.5 transition-all duration-300 cursor-pointer ${
            scrolled ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-2 pointer-events-none"
          }`}
        >
          Nhận báo giá
        </button>
      </div>
    </header>
  );
}

/* ------------------------------------------------------------------ */
/* Hero                                                                */
/* ------------------------------------------------------------------ */

function Hero({ data }) {
  return (
    <section id="top" className="relative h-[100svh] min-h-[560px] w-full overflow-hidden">
      <Img
        src={data.heroImage}
        alt={data.name}
        className="absolute inset-0 w-full h-full object-cover"
      />
      <div className="absolute inset-0 bg-gradient-to-b from-brand/35 via-brand/20 to-brand/55" />

      <div className="relative z-10 h-full flex flex-col items-center justify-center text-center px-6">
        <span
          className="animate-fade-up text-gold uppercase tracking-[0.3em] text-base md:text-xl font-semibold mb-4"
          style={{ textShadow: "0 2px 8px rgba(0,0,0,0.45)" }}
        >
          Chuẩn sống thịnh vượng
        </span>
        <h1
          className="animate-fade-up text-4xl md:text-6xl font-bold text-white max-w-4xl"
          style={{ textShadow: "0 2px 16px rgba(0,0,0,0.5)" }}
        >
          {data.name}
        </h1>
        <p
          className="animate-fade-up text-white/90 mt-5 max-w-2xl text-base md:text-lg"
          style={{ textShadow: "0 1px 6px rgba(0,0,0,0.45)" }}
        >
          {data.shortDescription}
        </p>

        <div className="animate-fade-up flex flex-wrap justify-center gap-3 mt-8">
          {data.badges.map((b) => (
            <div
              key={b.label}
              className="bg-black/25 backdrop-blur-md border border-white/20 rounded-2xl px-5 py-3 text-left"
            >
              <p className="text-gold text-xs font-semibold uppercase tracking-wide">{b.label}</p>
              <p className="text-white font-bold">{b.value}</p>
            </div>
          ))}
        </div>

        <a
          href="#lead-1"
          className="animate-fade-up mt-10 rounded-full bg-gold hover:bg-gold-dark text-brand text-base md:text-lg font-bold px-8 py-3.5 transition-colors"
        >
          Nhận bảng giá & chính sách
        </a>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Intro                                                               */
/* ------------------------------------------------------------------ */

function Intro({ data }) {
  return (
    <section id="intro" className="bg-white py-20 px-6 md:px-12">
      <div className="max-w-5xl mx-auto">
        <div className="relative rounded-3xl bg-brand px-8 py-14 md:p-16 overflow-hidden">
          <div className="absolute top-6 left-8 w-14 h-14 rounded-2xl bg-white/10 flex items-center justify-center -rotate-[15deg]">
            <i className="fa-solid fa-leaf text-gold text-2xl" />
          </div>
          <h2 className="font-serif text-3xl md:text-4xl font-bold text-white mt-12 mb-8">
            {data.name}
          </h2>
          <div className="flex flex-col gap-5">
            {data.longDescription.map((p, i) => (
              <p key={i} className="text-white/80 text-justify" style={{ fontSize: "1.0625rem", lineHeight: 1.75 }}>
                {p}
              </p>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* ProjectInfo                                                        */
/* ------------------------------------------------------------------ */

function ProjectInfo({ data }) {
  return (
    <section className="bg-white py-20 px-6 md:px-12">
      <div className="max-w-6xl mx-auto">
        <SectionHeading title={data.infoTitle} />
        <div className="grid md:grid-cols-2 gap-10">
          <div className="rounded-2xl overflow-hidden border border-brand/10">
            {data.info.map((row, i) => (
              <div
                key={row.label}
                className={`flex border-b border-brand/10 last:border-b-0 ${
                  i % 2 === 0 ? "bg-white" : "bg-brand/[0.03]"
                }`}
              >
                <div className="w-[160px] shrink-0 px-4 py-3 text-sm font-semibold text-brand">
                  {row.label}
                </div>
                <div className="px-4 py-3 text-sm text-brand/70">
                  {row.value.split("·").map((v, idx, arr) => (
                    <span key={idx}>
                      {v.trim()}
                      {idx < arr.length - 1 && <br />}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div className="h-full grid grid-cols-2 content-center gap-3">
            {data.highlights.map((h) => (
              <div
                key={h.label}
                className="group aspect-square rounded-full border-2 border-gold bg-brand flex flex-col items-center justify-center text-center p-6 transition-all duration-300 hover:bg-gold hover:scale-105 hover:shadow-xl cursor-default"
              >
                <p className="text-gold group-hover:text-brand text-xl md:text-2xl font-bold font-serif transition-colors">
                  {h.value}
                </p>
                <p className="text-white/70 group-hover:text-brand/70 text-xs md:text-sm mt-2 uppercase tracking-wide transition-colors">
                  {h.label}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* SalesPolicy                                                        */
/* ------------------------------------------------------------------ */

function SalesPolicy({ data }) {
  return (
    <section className="bg-white py-20 px-6 md:px-12">
      <div className="max-w-6xl mx-auto">
        <SectionHeading title={data.title} />
        <div className="grid md:grid-cols-3 gap-6">
          {data.items.map((item, i) => (
            <div
              key={i}
              className="bg-white rounded-2xl border border-brand/10 shadow-sm p-8 flex flex-col items-center text-center gap-4"
            >
              <div className="w-14 h-14 rounded-full bg-brand border-2 border-gold flex items-center justify-center">
                <i className="fa-solid fa-check text-gold text-xl" />
              </div>
              <p className="font-bold text-brand">{item}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* LeadFormSection                                                     */
/* ------------------------------------------------------------------ */

function LeadFormSection({ id, data, source }) {
  return (
    <section id={id} className="relative bg-brand py-20 px-6 md:px-12 overflow-hidden">
      <Particles />
      <div className="relative z-10 max-w-5xl mx-auto grid md:grid-cols-2 gap-10 items-center">
        <div className="text-white">
          <h2 className="font-serif text-3xl md:text-4xl font-bold mb-4">{data.title}</h2>
          <p className="text-white/70 mb-8" style={{ fontSize: "1.0625rem", lineHeight: 1.75 }}>
            {data.subtitle}
          </p>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center">
              <i className="fa-solid fa-phone text-gold text-lg" />
            </div>
            <div>
              <p className="text-white/60 text-xs">{data.note}</p>
              <a href={`tel:${data.hotline}`} className="text-gold text-2xl font-bold font-serif">
                {data.hotline}
              </a>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-3xl shadow-xl p-8">
          <LeadForm source={source} />
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Location                                                            */
/* ------------------------------------------------------------------ */

function Location({ data }) {
  return (
    <section id="location" className="bg-white py-16 md:py-24 px-4">
      <div className="max-w-6xl mx-auto grid md:grid-cols-2 gap-10 items-center px-2 md:px-8">
        <div>
          <h2 className="font-serif text-3xl md:text-4xl font-bold text-brand mb-3">
            {data.title}
          </h2>
          <span className="block w-16 h-1 rounded-full bg-gold mb-6" />
          <div className="flex flex-col gap-4">
            {data.paragraphs.map((p, i) => (
              <p key={i} className="text-brand/70" style={{ fontSize: "1.0625rem", lineHeight: 1.75 }}>
                {p}
              </p>
            ))}
          </div>
        </div>
        <Img
          src={data.image}
          zoomable
          className="w-full aspect-4/3 object-cover rounded-2xl shadow-lg"
        />
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Connectivity                                                        */
/* ------------------------------------------------------------------ */

function Connectivity({ data }) {
  return (
    <section className="bg-gradient-to-b from-[#eaf3ec] via-[#f4f8f4] to-white py-20 px-6 md:px-12">
      <div className="max-w-6xl mx-auto">
        <SectionHeading title={data.title} />
        <div className="flex flex-col gap-6">
          {data.items.map((item, i) => (
            <div
              key={item.title}
              className="relative bg-white rounded-3xl shadow-lg p-8 pl-12 md:pl-16"
            >
              <div className="absolute -left-5 top-8 w-12 h-12 rounded-full bg-brand text-gold font-bold flex items-center justify-center shadow-md">
                {i + 1}
              </div>
              <h3 className="font-serif text-xl md:text-2xl font-bold text-brand mb-3">
                {item.title}
              </h3>
              {item.paragraphs.map((p, idx) => (
                <p key={idx} className="text-brand/70 mb-3" style={{ fontSize: "1.0625rem", lineHeight: 1.75 }}>
                  {p}
                </p>
              ))}
              {item.bullets && (
                <ul className="list-disc list-inside text-brand/70 flex flex-col gap-1 mb-3">
                  {item.bullets.map((b, idx) => (
                    <li key={idx}>{b}</li>
                  ))}
                </ul>
              )}
              {item.footer && (
                <p className="text-brand font-semibold" style={{ fontSize: "1.0625rem" }}>
                  {item.footer}
                </p>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Differences                                                        */
/* ------------------------------------------------------------------ */

function Differences({ data }) {
  return (
    <section className="bg-gradient-to-b from-[#eaf3ec] via-[#f4f8f4] to-white py-20 px-6 md:px-12">
      <div className="max-w-6xl mx-auto">
        <SectionHeading title={data.title} />
        <div className="grid md:grid-cols-3 gap-8 mt-8">
          {data.items.map((item, i) => (
            <div key={item.title} className="relative bg-white rounded-2xl shadow-md pt-10 pb-8 px-6 text-center">
              <div className="absolute -top-6 left-1/2 -translate-x-1/2 w-12 h-12 rounded-full bg-brand text-gold font-bold flex items-center justify-center shadow-md">
                {i + 1}
              </div>
              <h3 className="font-serif text-lg font-bold text-brand mb-3">{item.title}</h3>
              <p className="text-brand/70 text-sm leading-relaxed">{item.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Amenities                                                           */
/* ------------------------------------------------------------------ */

function Amenities({ data }) {
  const images = data.images;
  const total = images.length;
  const visibleCount = 3;
  const [rawIndex, setRawIndex] = useState(0);
  const [transitionOn, setTransitionOn] = useState(true);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (paused || total <= visibleCount) return;
    const t = setInterval(() => {
      setRawIndex((i) => i + 1);
    }, 4000);
    return () => clearInterval(t);
  }, [paused, total]);

  useEffect(() => {
    if (rawIndex !== total) return;
    const t = setTimeout(() => {
      setTransitionOn(false);
      setRawIndex(0);
    }, 700);
    return () => clearTimeout(t);
  }, [rawIndex, total]);

  useEffect(() => {
    if (transitionOn) return;
    const raf = requestAnimationFrame(() => setTransitionOn(true));
    return () => cancelAnimationFrame(raf);
  }, [transitionOn]);

  const activeDot = rawIndex % total;
  const slideWidth = 100 / visibleCount;

  return (
    <section id="amenities" className="bg-white py-20 px-6 md:px-12">
      <div className="max-w-6xl mx-auto">
        <SectionHeading title={data.title} />
        <div className="max-w-3xl mx-auto text-center mb-12">
          {data.paragraphs.map((p, i) => (
            <p key={i} className="text-brand/70" style={{ fontSize: "1.0625rem", lineHeight: 1.75 }}>
              {p}
            </p>
          ))}
        </div>

        <div
          className="overflow-hidden"
          onMouseEnter={() => setPaused(true)}
          onMouseLeave={() => setPaused(false)}
        >
          <div
            className={`flex ${transitionOn ? "transition-transform duration-700 ease-in-out" : ""}`}
            style={{ transform: `translateX(-${rawIndex * slideWidth}%)` }}
          >
            {images.concat(images.slice(0, visibleCount)).map((img, i) => (
              <div
                key={`${img.src}-${i}`}
                className="shrink-0 px-2.5"
                style={{ width: `${slideWidth}%` }}
              >
                <div className="group flex flex-col gap-2">
                  <div className="overflow-hidden rounded-xl shadow-sm">
                    <Img
                      src={img.src}
                      zoomable
                      className="w-full aspect-4/3 object-cover transition-transform duration-500 group-hover:scale-110"
                    />
                  </div>
                  <p className="text-center text-sm font-medium text-brand/70">{img.caption}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {total > visibleCount && (
          <div className="flex justify-center gap-2 mt-6">
            {images.map((img, i) => (
              <button
                key={img.src}
                onClick={() => {
                  setTransitionOn(true);
                  setRawIndex(i);
                }}
                className={`h-2 rounded-full transition-all ${
                  i === activeDot ? "w-8 bg-gold" : "w-2 bg-brand/20"
                }`}
                aria-label={`Xem tiện ích ${i + 1}`}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* FloorPlan                                                          */
/* ------------------------------------------------------------------ */

function FloorPlan({ data }) {
  return (
    <section id="floorplan" className="bg-white py-16 md:py-24 px-4">
      <div className="max-w-6xl mx-auto grid md:grid-cols-2 gap-10 items-center px-2 md:px-8">
        <Img
          src={data.image}
          zoomable
          className="w-full aspect-4/3 object-cover rounded-2xl shadow-lg order-1 md:order-none"
        />
        <div>
          <h2 className="font-serif text-3xl md:text-4xl font-bold text-brand mb-3">
            {data.title}
          </h2>
          <span className="block w-16 h-1 rounded-full bg-gold mb-6" />
          <div className="flex flex-col gap-4">
            {data.paragraphs.map((p, i) => (
              <p key={i} className="text-brand/70" style={{ fontSize: "1.0625rem", lineHeight: 1.75 }}>
                {p}
              </p>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* PerspectiveShowcase                                                 */
/* ------------------------------------------------------------------ */

function PerspectiveShowcase({ data }) {
  const [active, setActive] = useState(0);
  const total = data.images.length;

  const prev = () => setActive((i) => (i - 1 + total) % total);
  const next = () => setActive((i) => (i + 1) % total);

  return (
    <section className="bg-white py-16 md:py-24">
      <div className="max-w-5xl mx-auto px-6 mb-10 text-center">
        <h2 className="font-serif text-3xl md:text-4xl font-bold text-brand mb-3">{data.title}</h2>
        <span className="block w-16 h-1 rounded-full bg-gold mx-auto mb-5" />
        <p className="text-brand/70 max-w-2xl mx-auto">{data.subtitle}</p>
      </div>

      <div className="relative w-full h-[45vh] md:h-[70vh] overflow-hidden">
        {data.images.map((img, i) => (
          <div
            key={img.src}
            className={`absolute inset-0 transition-opacity duration-700 ${
              i === active ? "opacity-100" : "opacity-0 pointer-events-none"
            }`}
          >
            <Img src={img.src} className="w-full h-full object-cover" />
            <div className="absolute bottom-0 left-0 right-0 bg-black/30 backdrop-blur-sm px-6 py-4">
              <p className="text-white font-medium text-center">{img.caption}</p>
            </div>
          </div>
        ))}

        <button
          onClick={prev}
          className="absolute left-4 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-white/80 hover:bg-white shadow-lg flex items-center justify-center text-brand"
          aria-label="Ảnh trước"
        >
          <i className="fa-solid fa-chevron-left" />
        </button>
        <button
          onClick={next}
          className="absolute right-4 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-white/80 hover:bg-white shadow-lg flex items-center justify-center text-brand"
          aria-label="Ảnh kế tiếp"
        >
          <i className="fa-solid fa-chevron-right" />
        </button>
      </div>

      <div className="flex justify-center gap-2 mt-6">
        {data.images.map((img, i) => (
          <button
            key={img.src}
            onClick={() => setActive(i)}
            className={`h-2 rounded-full transition-all ${
              i === active ? "w-8 bg-gold" : "w-2 bg-brand/20"
            }`}
            aria-label={`Xem ảnh ${i + 1}`}
          />
        ))}
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Design                                                              */
/* ------------------------------------------------------------------ */

function Design({ data }) {
  return (
    <section className="bg-white py-20 px-6 md:px-12">
      <div className="max-w-6xl mx-auto">
        <SectionHeading title={data.title} />
        <div className="max-w-3xl mx-auto flex flex-col gap-4 text-center mb-12">
          {data.paragraphs.map((p, i) => (
            <p key={i} className="text-brand/70" style={{ fontSize: "1.0625rem", lineHeight: 1.75 }}>
              {p}
            </p>
          ))}
        </div>
        <div className="grid md:grid-cols-2 gap-6">
          {data.images.map((src) => (
            <Img
              key={src}
              src={src}
              zoomable
              className="w-full aspect-video object-cover rounded-2xl shadow-lg"
            />
          ))}
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Pricing                                                            */
/* ------------------------------------------------------------------ */

function DashedCTA({ children }) {
  return (
    <div className="relative block w-full">
      <svg className="absolute inset-0 w-full h-full pointer-events-none">
        <rect
          x="2.5"
          y="2.5"
          width="calc(100% - 5px)"
          height="calc(100% - 5px)"
          rx="9"
          fill="none"
          stroke="#fff"
          strokeOpacity="0.85"
          strokeWidth="1.5"
          strokeDasharray="5 4"
          className="marching-ants"
        />
      </svg>
      {children}
    </div>
  );
}

function Pricing({ data }) {
  return (
    <section id="pricing" className="bg-white py-20 px-6 md:px-12">
      <div className="max-w-6xl mx-auto">
        <SectionHeading title={data.title} />
        <div className="max-w-6xl mx-auto grid md:grid-cols-2 gap-8">
          {data.units.map((unit) => (
            <div key={unit.type} className="rounded-2xl overflow-hidden border border-brand/10 shadow-md">
              <Img src={unit.image} className="w-full aspect-video object-cover" />
              <div className="bg-brand text-center py-3">
                <p className="text-gold font-serif font-bold text-lg">{unit.type}</p>
              </div>
              <div className="p-6 flex flex-col gap-3">
                <div className="flex justify-between border-b border-brand/10 pb-2 text-sm">
                  <span className="text-brand/60">Diện tích</span>
                  <span className="font-semibold text-brand">{unit.area}</span>
                </div>
                <div className="flex justify-between border-b border-brand/10 pb-2 text-sm">
                  <span className="text-brand/60">Giá bán</span>
                  <span className="font-semibold text-gold-dark">{unit.price}</span>
                </div>
                <div className="flex justify-between pb-2 text-sm">
                  <span className="text-brand/60">Thanh toán</span>
                  <span className="font-semibold text-brand">{unit.payment}</span>
                </div>
                <DashedCTA>
                  <a
                    href="#lead-2"
                    className="relative block w-full text-center rounded-xl py-3 mt-2 text-sm font-semibold text-white hover:brightness-110 transition"
                    style={{ backgroundColor: "var(--color-gold)" }}
                  >
                    Nhận báo giá chi tiết
                  </a>
                </DashedCTA>
              </div>
            </div>
          ))}
        </div>
        <p className="max-w-4xl mx-auto text-center text-sm text-brand/50 mt-8">{data.note}</p>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* ProductTypes                                                        */
/* ------------------------------------------------------------------ */

function ProductTypes({ data }) {
  return (
    <section>
      <div className="bg-white py-20 px-6 md:px-12">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="font-serif text-3xl md:text-4xl font-bold text-brand mb-3">
            {data.title}
          </h2>
          <span className="block w-16 h-1 rounded-full bg-gold mx-auto mb-6" />
          <p className="text-brand/70" style={{ fontSize: "1.0625rem", lineHeight: 1.75 }}>
            {data.intro}
          </p>
        </div>
      </div>

      {data.items.map((item, i) => {
        const dark = i % 2 === 1;
        const imageFirst = i % 2 === 1;
        return (
          <div
            key={item.title}
            className={`py-16 md:py-24 px-4 ${dark ? "bg-brand" : "bg-white"}`}
          >
            <div className="max-w-6xl mx-auto grid md:grid-cols-2 gap-10 items-center px-2 md:px-8">
              <div className={imageFirst ? "order-1 md:order-none" : "order-1"}>
                <Img
                  src={item.image}
                  zoomable
                  className="w-full aspect-4/3 object-cover rounded-2xl shadow-xl"
                />
              </div>
              <div className={imageFirst ? "" : "md:order-none"}>
                <h3
                  className={`font-serif text-2xl md:text-3xl font-bold mb-4 ${
                    dark ? "text-white" : "text-brand"
                  }`}
                >
                  {item.title}
                </h3>
                <p
                  className={`mb-6 ${dark ? "text-white/70" : "text-brand/70"}`}
                  style={{ fontSize: "1.0625rem", lineHeight: 1.75 }}
                >
                  {item.description}
                </p>
                <div className="flex flex-col gap-2 mb-8">
                  {item.specs.map((spec) => (
                    <div
                      key={spec.label}
                      className={`flex justify-between border-b pb-2 text-sm ${
                        dark ? "border-white/15" : "border-brand/10"
                      }`}
                    >
                      <span className={dark ? "text-white/60" : "text-brand/60"}>
                        {spec.label}
                      </span>
                      <span className={`font-semibold ${dark ? "text-white" : "text-brand"}`}>
                        {spec.value}
                      </span>
                    </div>
                  ))}
                </div>
                <a
                  href="#lead-2"
                  className="inline-block rounded-full bg-gold hover:bg-gold-dark text-brand font-semibold px-8 py-3 transition-colors"
                >
                  {item.ctaLabel}
                </a>
              </div>
            </div>
          </div>
        );
      })}
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Reasons                                                             */
/* ------------------------------------------------------------------ */

function Reasons({ data }) {
  return (
    <section className="bg-white py-20 px-6 md:px-12">
      <div className="max-w-4xl mx-auto">
        <SectionHeading title={data.title} />
        <div className="flex flex-col gap-8 mt-4">
          {data.items.map((item, i) => (
            <div key={item.title} className="flex gap-5">
              <div className="shrink-0 w-10 h-10 rounded-full bg-gold text-brand font-bold flex items-center justify-center">
                {i + 1}
              </div>
              <div>
                <h3 className="font-serif text-lg font-bold text-brand mb-1">{item.title}</h3>
                <p className="text-brand/70" style={{ fontSize: "1.0625rem", lineHeight: 1.75 }}>
                  {item.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Buyers                                                              */
/* ------------------------------------------------------------------ */

function Buyers({ data }) {
  return (
    <section className="bg-gradient-to-b from-[#eaf3ec] via-[#f4f8f4] to-white py-20 px-6 md:px-12">
      <div className="max-w-6xl mx-auto">
        <SectionHeading title={data.title} />
        <div className="grid md:grid-cols-3 gap-6">
          {data.items.map((item) => (
            <div
              key={item.title}
              className="bg-white rounded-2xl border-t-4 border-gold shadow-md p-8 text-center"
            >
              <h3 className="font-serif text-lg font-bold text-brand mb-3">{item.title}</h3>
              <p className="text-brand/70 text-sm leading-relaxed">{item.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* FAQ                                                                 */
/* ------------------------------------------------------------------ */

function FAQ({ data }) {
  const [openIdx, setOpenIdx] = useState(null);

  return (
    <section className="bg-white py-20 px-6 md:px-12">
      <div className="max-w-4xl mx-auto">
        <SectionHeading title={data.title} />
        <div className="flex flex-col gap-4">
          {data.items.map((item, i) => {
            const isOpen = openIdx === i;
            return (
              <div
                key={item.question}
                className={`rounded-2xl border transition-colors ${
                  isOpen ? "border-gold" : "border-brand/10"
                }`}
              >
                <button
                  onClick={() => setOpenIdx(isOpen ? null : i)}
                  className="w-full flex items-center justify-between gap-4 px-6 py-5 text-left"
                >
                  <span className="font-semibold text-brand">{item.question}</span>
                  <i
                    className={`fa-solid fa-chevron-down text-gold-dark transition-transform duration-300 ${
                      isOpen ? "rotate-180" : ""
                    }`}
                  />
                </button>
                <div className={`accordion-content ${isOpen ? "open" : ""}`}>
                  <div className="accordion-inner">
                    <p className="px-6 pb-5 text-brand/70" style={{ fontSize: "1.0625rem", lineHeight: 1.75 }}>
                      {item.answer}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Consultant                                                          */
/* ------------------------------------------------------------------ */

function Consultant({ data }) {
  return (
    <section className="bg-white py-20 px-6 md:px-12 overflow-hidden">
      <div className="max-w-6xl mx-auto">
        <SectionHeading title={data.title} />
        <div className="grid md:grid-cols-[470px_1fr] gap-10 items-center">
          <Img
            src={data.image}
            className="w-full max-w-[470px] aspect-square object-cover rounded-3xl shadow-xl md:-ml-6"
          />
          <div>
            <h3 className="font-serif text-2xl md:text-3xl font-bold text-brand mb-2">
              {data.name}
            </h3>
            <p className="uppercase tracking-widest text-sm text-gold-dark font-semibold mb-5">
              {data.role}
            </p>
            <div className="flex flex-col gap-4 mb-6">
              {data.description.map((p, i) => (
                <p key={i} className="text-brand/70" style={{ fontSize: "1.0625rem", lineHeight: 1.75 }}>
                  {p}
                </p>
              ))}
            </div>
            <a
              href={`tel:${data.phone}`}
              className="inline-flex items-center gap-3 rounded-full bg-brand hover:bg-brand-light text-white pl-3 pr-6 py-2.5 transition-colors"
            >
              <span className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center">
                <i className="fa-solid fa-phone text-gold" />
              </span>
              <span className="font-semibold">{data.phone}</span>
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Footer                                                              */
/* ------------------------------------------------------------------ */

function Footer({ data, logo, name }) {
  return (
    <footer className="bg-white py-16 px-6 md:px-12">
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col md:flex-row justify-between gap-8 mb-8">
          <div>
            <Img src={logo} alt={name} className="h-12 w-auto object-contain mb-4" />
            <p className="font-semibold text-brand">{data.company}</p>
            <p className="text-brand/60 text-sm mt-1 max-w-sm">{data.address}</p>
          </div>
          <div className="text-left md:text-right">
            <p className="text-brand/60 text-sm">Hotline</p>
            <a href={`tel:${data.hotline}`} className="text-gold-dark font-bold text-lg">
              {data.hotline}
            </a>
          </div>
        </div>
        <div className="border-t border-brand/10 pt-6 flex flex-col md:flex-row justify-between items-center gap-3 text-sm text-brand/50">
          <p>{data.copyright}</p>
          <div className="flex gap-5">
            <a href="/chinh-sach-bao-mat.html" className="hover:text-brand">
              Chính sách bảo mật
            </a>
            <a href="/dieu-khoan.html" className="hover:text-brand">
              Điều khoản sử dụng
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}

/* ------------------------------------------------------------------ */
/* FloatingCTAs                                                        */
/* ------------------------------------------------------------------ */

function FloatingCTAs({ zalo, onOpenPopup }) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="fixed bottom-4 left-4 z-40 w-[calc(100%-2rem)] max-w-sm">
      {collapsed ? (
        <button
          onClick={() => setCollapsed(false)}
          className="h-7 w-12 rounded-full bg-black/35 hover:bg-black/50 backdrop-blur-md ring-1 ring-white/30 shadow-xl flex items-center justify-center text-white transition-colors cursor-pointer"
          aria-label="Mở nhanh"
        >
          <svg
            viewBox="0 0 24 24"
            className="h-4 w-4"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="m18 15-6-6-6 6" />
          </svg>
        </button>
      ) : (
        <div className="relative rounded-3xl bg-white/20 backdrop-blur-md ring-1 ring-white/30 shadow-xl p-3 pt-5 flex flex-col gap-2">
          <button
            onClick={() => setCollapsed(true)}
            className="absolute -top-3 left-1/2 -translate-x-1/2 h-7 w-12 rounded-full bg-black/35 hover:bg-black/50 backdrop-blur-md ring-1 ring-white/30 flex items-center justify-center text-white transition-colors cursor-pointer"
            aria-label="Thu gọn"
          >
            <svg
              viewBox="0 0 24 24"
              className="h-4 w-4"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="m6 9 6 6 6-6" />
            </svg>
          </button>

          <a
            href={zalo}
            target="_blank"
            rel="noreferrer"
            className="w-full flex items-center justify-center gap-2.5 py-2.5 px-5 rounded-full text-base font-bold text-white shadow-lg shadow-black/30 hover:brightness-110 transition"
            style={{ backgroundColor: "#0068ff" }}
          >
            <svg viewBox="0 0 24 24" className="h-6 w-6 shrink-0" fill="currentColor">
              <path d="M12 2C6.48 2 2 6.03 2 11c0 2.86 1.48 5.41 3.79 7.06-.12.98-.5 2.32-1.29 3.53a.4.4 0 0 0 .43.6c1.6-.32 3.16-1.05 4.19-1.72.92.22 1.89.33 2.88.33 5.52 0 10-4.03 10-9S17.52 2 12 2Z" />
            </svg>
            TƯ VẤN QUA ZALO VỚI CEO
          </a>

          <button
            type="button"
            onClick={onOpenPopup}
            className="w-full flex items-center justify-center gap-2.5 py-2.5 px-5 rounded-full text-base font-bold text-white shadow-lg shadow-black/30 hover:brightness-110 transition cursor-pointer"
            style={{ backgroundColor: "#e11d2a" }}
          >
            <svg
              viewBox="0 0 24 24"
              className="h-6 w-6 shrink-0"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M6 2h9l5 5v15H6V2Z" />
              <path d="M14 2v5h5" />
              <path d="M9 13h6" />
              <path d="M9 17h6" />
            </svg>
            TẢI GIỎ HÀNG ĐỘC QUYỀN ĐỢT 1
          </button>
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* ZaloButton                                                          */
/* ------------------------------------------------------------------ */

function ZaloButton({ zalo }) {
  return (
    <a
      href={zalo}
      target="_blank"
      rel="noreferrer"
      className="fixed bottom-6 right-6 z-40 w-14 h-14 rounded-full flex items-center justify-center"
      style={{ backgroundColor: "#0068ff" }}
      aria-label="Chat Zalo"
    >
      <span className="zalo-wave-1 absolute inset-0 rounded-full" style={{ backgroundColor: "#0068ff" }} />
      <span className="zalo-wave-2 absolute inset-0 rounded-full" style={{ backgroundColor: "#0068ff" }} />
      <i className="fa-solid fa-comment-dots text-white text-2xl relative z-10" />
    </a>
  );
}

/* ------------------------------------------------------------------ */
/* PopupForm                                                           */
/* ------------------------------------------------------------------ */

function PopupForm({ data, visible, onOpen, onClose }) {
  const interactedRef = useRef(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [agreed, setAgreed] = useState(false);
  const [status, setStatus] = useState("idle");
  const [error, setError] = useState("");

  useEffect(() => {
    const markInteracted = () => {
      interactedRef.current = true;
    };
    window.addEventListener("click", markInteracted, { once: true });

    const t = setTimeout(() => {
      onOpen();
    }, 10000);

    return () => {
      clearTimeout(t);
      window.removeEventListener("click", markInteracted);
    };
  }, [onOpen]);

  useEffect(() => {
    if (!visible) return;
    const onKey = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [visible, onClose]);

  useEffect(() => {
    if (status !== "success") return;
    const t = setTimeout(() => onClose(), 3000);
    return () => clearTimeout(t);
  }, [status, onClose]);

  if (!visible) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (!name.trim()) {
      setError("Vui lòng nhập họ tên.");
      return;
    }
    if (!/^\d{9,11}$/.test(phone.trim())) {
      setError("Số điện thoại không hợp lệ.");
      return;
    }
    if (!agreed) {
      setError("Vui lòng đồng ý với chính sách bảo mật.");
      return;
    }
    setStatus("loading");
    try {
      await fetch("/api/lead", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectName: mockData.name,
          createdAt: new Date().toISOString(),
          name,
          phone,
          source: "popup",
        }),
      });
    } catch (_) {
      // ignore
    }
    if (typeof window !== "undefined" && typeof window.fbq === "function") {
      window.fbq("track", "Lead");
    }
    setStatus("success");
  };

  return (
    <div
      className="fixed inset-0 z-[150] flex items-center justify-center px-4 fade-in"
      style={{ backgroundColor: "rgba(0,0,0,0.6)" }}
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-2xl bg-brand border-2 border-dashed border-white/40 rounded-2xl p-8 md:p-10"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-5 text-3xl leading-none text-white/70 hover:text-white cursor-pointer"
          aria-label="Đóng"
        >
          &times;
        </button>

        <div className="text-center mb-7">
          <p className="text-white/80 text-sm uppercase tracking-widest">{data.title[0]}</p>
          <p className="font-serif text-white text-2xl md:text-3xl font-bold mt-2">
            {data.title[1]}
          </p>
        </div>

        <div className="grid grid-cols-3 gap-4 mb-7">
          {data.cards.map((c) => (
            <div key={c.label} className="rounded-xl p-4 text-center bg-gold">
              <p className="text-xs font-bold text-white/90 uppercase tracking-wide">{c.label}</p>
              <p className="font-serif text-3xl font-bold text-white my-2">{c.value}</p>
              <p className="text-white/80 text-xs">{c.sub}</p>
            </div>
          ))}
        </div>

        {status === "success" ? (
          <div className="text-center text-white py-6">
            <p className="font-serif text-xl font-bold">Cảm ơn quý khách!</p>
            <p className="text-white/80 text-sm mt-1">
              Chuyên viên tư vấn sẽ liên hệ với bạn trong thời gian sớm nhất.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="rounded-xl p-6 space-y-4">
            <input
              type="text"
              placeholder="Họ và tên"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-3.5 rounded-lg border border-gray-200 bg-white text-gray-800 text-base outline-none"
            />
            <input
              type="tel"
              placeholder="Số điện thoại"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full px-4 py-3.5 rounded-lg border border-gray-200 bg-white text-gray-800 text-base outline-none"
            />
            <label className="flex items-start gap-2 text-xs text-white/80 cursor-pointer">
              <input
                type="checkbox"
                checked={agreed}
                onChange={(e) => setAgreed(e.target.checked)}
                className="sr-only peer"
              />
              <span
                className={`mt-0.5 shrink-0 w-4 h-4 rounded border-2 flex items-center justify-center transition-colors ${
                  agreed ? "bg-gold border-gold" : "border-white/40"
                }`}
              >
                {agreed && (
                  <svg viewBox="0 0 24 24" className="w-3 h-3 text-white" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20 6 9 17l-5-5" />
                  </svg>
                )}
              </span>
              <span>
                Tôi đồng ý với{" "}
                <a href="/chinh-sach-bao-mat.html" className="text-gold underline">
                  Chính sách bảo mật
                </a>
              </span>
            </label>
            {error && <p className="text-sm text-red-300">{error}</p>}
            <button
              type="submit"
              disabled={status === "loading"}
              className="w-full py-4 rounded-lg font-bold text-white text-base tracking-wider bg-gold hover:brightness-110 transition disabled:opacity-60 cursor-pointer"
            >
              {status === "loading" ? "ĐANG GỬI..." : "TÔI MUỐN NHẬN NGAY"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* LandingPage (root)                                                  */
/* ------------------------------------------------------------------ */

export default function LandingPage() {
  const data = mockData;
  const theme = data.theme;
  const [popupVisible, setPopupVisible] = useState(false);

  const openPopup = useCallback(() => setPopupVisible(true), []);
  const closePopup = useCallback(() => setPopupVisible(false), []);

  return (
    <LightboxProvider>
      <div
        className="font-sans"
        style={{
          "--color-brand": theme.brand,
          "--color-brand-light": theme.brandLight,
          "--color-gold": theme.gold,
          "--color-gold-dark": theme.goldDark,
        }}
      >
        <Header data={data} onOpenPopup={openPopup} />
        <Hero data={data} />
        <Intro data={data} />
        <ProjectInfo data={data} />
        <SalesPolicy data={data.salesPolicy} />
        <LeadFormSection id="lead-1" data={data.cta} source="lead-1" />
        <Location data={data.location} />
        <Connectivity data={data.connectivity} />
        <Differences data={data.differences} />
        <Amenities data={data.amenities} />
        <FloorPlan data={data.floorPlan} />
        <PerspectiveShowcase data={data.perspectiveShowcase} />
        <Design data={data.design} />
        <Pricing data={data.pricing} />
        <ProductTypes data={data.productTypes} />
        <LeadFormSection id="lead-2" data={data.cta} source="lead-2" />
        <Reasons data={data.reasons} />
        <Buyers data={data.buyers} />
        <FAQ data={data.faq} />
        <Consultant data={data.consultant} />
        <LeadFormSection id="contact" data={data.cta} source="contact" />
        <Footer data={data.footer} logo={data.logoGroup} name={data.name} />

        <FloatingCTAs zalo={data.zalo} onOpenPopup={openPopup} />
        <ZaloButton zalo={data.zalo} />
        <PopupForm data={data.popup} visible={popupVisible} onOpen={openPopup} onClose={closePopup} />
      </div>
    </LightboxProvider>
  );
}
