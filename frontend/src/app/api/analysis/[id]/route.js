import { NextResponse } from 'next/server';
import { getAnalysisById } from '../../../../../utils/database';

export async function GET(request, { params }) {
  try {
    const analysis = await getAnalysisById(params.id);
    return NextResponse.json(analysis);
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
