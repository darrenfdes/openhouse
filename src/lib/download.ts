/** Saves text as a file in the viewer's browser. Nothing leaves the device. */
export function downloadText(name: string, text: string, type = 'application/json') {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function downloadJson(name: string, value: unknown) {
  downloadText(name, `${JSON.stringify(value, null, 2)}\n`);
}

export function fileName(planName: string): string {
  return `${planName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'plan'}.openhouse.json`;
}
