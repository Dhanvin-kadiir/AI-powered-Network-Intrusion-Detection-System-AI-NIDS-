
export async function scoreFlows(flows: any[]) {
  const res = await fetch(`${import.meta.env.VITE_API_URL}/score`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ records: flows }),
  });
  if (!res.ok) throw new Error(await res.text());
  const data = await res.json();
  return (data.scores as number[]) || [];
}

export async function apiStatus() {
  try {
    const r = await fetch(`${import.meta.env.VITE_API_URL}/status`);
    if (!r.ok) return { model_loaded: false };
    return await r.json();
  } catch {
    return { model_loaded: false };
  }
}
