import { NextRequest, NextResponse } from 'next/server';
import { createOrder, getOrderByInvoice } from '../../../actions/order-actions';
import { CreateOrderInput } from '../../../types/database';

/**
 * POST /api/orders
 * Endpoint Hybrid Checkout Atomik (Validasi stok & harga DB, generate invoice, kurangi stok, return URL WA)
 */
export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as CreateOrderInput;
    const result = await createOrder(body);

    if (!result.success) {
      return NextResponse.json(result, { status: 400 });
    }

    return NextResponse.json(result, { status: 201 });
  } catch {
    return NextResponse.json(
      { success: false, error: 'Payload JSON tidak valid.' },
      { status: 400 }
    );
  }
}

/**
 * GET /api/orders?q=<invoice_code_atau_nama>
 * Endpoint Lacak Pesanan Publik berdasarkan kode invoice atau nama pelanggan
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const query = searchParams.get('q') || '';
  const result = await getOrderByInvoice(query);

  if (!result.success) {
    return NextResponse.json(result, { status: 400 });
  }

  return NextResponse.json(result, { status: 200 });
}
