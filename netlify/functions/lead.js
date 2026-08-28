export async function handler(event) {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  let payload;
  try {
    payload = JSON.parse(event.body || "{}");
  } catch (_) {
    return { statusCode: 400, body: "Invalid JSON" };
  }

  const { projectName, createdAt, name, phone, source } = payload;

  if (!name || !phone) {
    return { statusCode: 400, body: "Missing required fields" };
  }

  // [ĐIỀN]: Kết nối tới hạ tầng lưu trữ lead thực tế của Solia
  // (email, Google Sheet, CRM...). Hiện tại chỉ log lại để xác nhận nhận request.
  console.log("New lead:", { projectName, createdAt, name, phone, source });

  return {
    statusCode: 200,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ok: true }),
  };
}
