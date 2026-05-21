export async function POST(request) {
  try {
    const pdfModule = await import('pdf-parse');
    const pdfParse = pdfModule.default ?? pdfModule;

    const formData = await request.formData();
    const file = formData.get('pdf');
    if (!file) return Response.json({ error: 'No PDF provided' }, { status: 400 });

    const buffer = Buffer.from(await file.arrayBuffer());
    const data = await pdfParse(buffer);

    if (!data.text?.trim()) {
      return Response.json({ error: 'Could not extract text from this PDF. It may be scanned or image-based.' }, { status: 422 });
    }

    return Response.json({ text: data.text });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}
