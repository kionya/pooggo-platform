export type MessengerLink =
  | { kind: "link"; channel: string; label: string; url: string }
  | { kind: "copy"; channel: string; label: string; value: string };

const digits = (s: string) => s.replace(/[^\d]/g, "");

export function buildMessengerLinks(m: Record<string, string> | null | undefined): MessengerLink[] {
  const out: MessengerLink[] = [];
  if (!m) return out;
  const has = (v?: string) => typeof v === "string" && v.trim().length > 0;

  if (has(m.whatsapp)) out.push({ kind: "link", channel: "whatsapp", label: "WhatsApp", url: `https://wa.me/${digits(m.whatsapp)}` });
  if (has(m.line)) out.push({ kind: "link", channel: "line", label: "LINE", url: `https://line.me/R/ti/p/${encodeURIComponent(m.line.trim())}` });
  if (has(m.wechat)) out.push({ kind: "copy", channel: "wechat", label: "WeChat", value: m.wechat.trim() });
  if (has(m.kakao)) {
    const k = m.kakao.trim();
    if (/^https?:\/\//.test(k)) out.push({ kind: "link", channel: "kakao", label: "KakaoTalk", url: k });
    else out.push({ kind: "copy", channel: "kakao", label: "KakaoTalk", value: k }); // URL 아니면 ID 복사로 안전 처리
  }
  if (has(m.messenger)) {
    const id = m.messenger.trim().replace(/^https?:\/\//, "").replace(/^m\.me\//, "");
    out.push({ kind: "link", channel: "messenger", label: "Messenger", url: `https://m.me/${id}` });
  }
  if (has(m.phone)) out.push({ kind: "link", channel: "phone", label: "Phone", url: `tel:${m.phone.trim()}` });
  if (has(m.email)) out.push({ kind: "link", channel: "email", label: "Email", url: `mailto:${m.email.trim()}` });
  return out;
}
