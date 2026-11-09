/**
 * CampusX End-to-End Automated API Verification Suite
 * Tests Auth, OTP, Products, Bargaining, Atomic Auctions, Orders, Escrow, and Reviews.
 */

const BASE = 'http://localhost:5000/api';

async function req(url, options = {}) {
  const res = await fetch(`${BASE}${url}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(`[${res.status}] ${url}: ${data.error || res.statusText}`);
  }
  return data;
}

async function runTests() {
  console.log('========================================================');
  console.log(' Starting CampusX Automated E2E Verification Suite');
  console.log('========================================================\n');

  let passed = 0;
  let total = 0;

  async function test(name, fn) {
    total++;
    try {
      await fn();
      console.log(`✓ [PASS] ${name}`);
      passed++;
    } catch (err) {
      console.error(`✗ [FAIL] ${name}: ${err.message}`);
    }
  }

  // 1. Health check
  await test('Server Health Check', async () => {
    const health = await req('/health');
    if (health.status !== 'ok') throw new Error('Health check status not ok');
  });

  // 2. OTP Generation
  let testOtp = '';
  await test('Send Email OTP to University Domain', async () => {
    const res = await req('/auth/send-otp', {
      method: 'POST',
      body: JSON.stringify({ email: 'autotest@lpu.in', purpose: 'register' }),
    });
    if (!res.success || !res.dev_otp) throw new Error('OTP send failed');
    testOtp = res.dev_otp;
  });

  // 3. OTP Verification
  await test('Verify 6-Digit Email OTP', async () => {
    const res = await req('/auth/verify-otp', {
      method: 'POST',
      body: JSON.stringify({ email: 'autotest@lpu.in', otp: testOtp, purpose: 'register' }),
    });
    if (!res.success) throw new Error('OTP verify failed');
  });

  // 4. Student Registration
  let newStudentToken = '';
  const uniqueEmail = `student_${Date.now()}@lpu.in`;
  await test('Student Registration with University Email', async () => {
    const res = await req('/auth/register', {
      method: 'POST',
      body: JSON.stringify({
        name: 'Auto Test Student',
        email: uniqueEmail,
        password: 'password123',
        university: 'Lovely Professional University',
        phone: '+91 99999 88888',
      }),
    });
    if (!res.token || !res.user.student_verified) throw new Error('Registration failed');
    newStudentToken = res.token;
  });

  // 5. Login Existing Seeded Student (Rahul)
  let rahulToken = '';
  let rahulUser = null;
  await test('Student Login (Rahul Sharma)', async () => {
    const res = await req('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: 'rahul@lpu.in', password: 'password123' }),
    });
    if (!res.token) throw new Error('Login failed');
    rahulToken = res.token;
    rahulUser = res.user;
  });

  // 6. Login Existing Seeded Student (Amit)
  let amitToken = '';
  let amitUser = null;
  await test('Student Login (Amit Kumar)', async () => {
    const res = await req('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: 'amit@lpu.in', password: 'password123' }),
    });
    if (!res.token) throw new Error('Login failed');
    amitToken = res.token;
    amitUser = res.user;
  });

  // 7. Products List & Search
  let productsList = [];
  await test('Browse Products with Query Filter', async () => {
    productsList = await req('/products?category=Laptops');
    if (!Array.isArray(productsList) || productsList.length === 0) throw new Error('No laptops found');
  });

  // 8. Create Product with Attributes & Private Reserve Price
  let createdProduct = null;
  await test('Create Product Listing with Private Reserve Price', async () => {
    createdProduct = await req('/products', {
      method: 'POST',
      headers: { Authorization: `Bearer ${rahulToken}` },
      body: JSON.stringify({
        title: 'Raspberry Pi 4 Model B (8GB RAM) with Aluminium Case',
        description: 'Barely used IoT project board with heat sinks and 64GB SanDisk card.',
        category: 'Laptops',
        subcategory: 'Electronics',
        price: 7500,
        minimum_price: 6800,
        condition: 'Like New',
        listing_type: 'negotiable',
        location: 'Block 34 Gate',
        attributes: { ram: '8GB', board: 'Pi 4B' },
      }),
    });
    if (!createdProduct._id) throw new Error('Product creation failed');
  });

  // 9. Verify Private Reserve Price is Hidden from Public
  await test('Verify minimum_price is hidden from public API', async () => {
    const pub = await req(`/products/${createdProduct._id}`);
    if (pub.minimum_price !== undefined) throw new Error('minimum_price was leaked to public endpoint!');
  });

  // 10. Verify Private Reserve Price is returned only to the Owner
  await test('Verify minimum_price is visible on /products/mine/private to owner', async () => {
    const mine = await req('/products/mine/private', {
      headers: { Authorization: `Bearer ${rahulToken}` },
    });
    const found = mine.find((p) => p._id === createdProduct._id);
    if (!found || found.minimum_price !== 6800) throw new Error('minimum_price missing on private endpoint');
  });

  // 11. Bargaining & Offer Negotiation Flow
  let negotiation = null;
  await test('Buyer (Amit) Opens Negotiation with Initial Offer', async () => {
    negotiation = await req('/negotiations', {
      method: 'POST',
      headers: { Authorization: `Bearer ${amitToken}` },
      body: JSON.stringify({ product_id: createdProduct._id, amount: 6500 }),
    });
    if (!negotiation._id || negotiation.negotiation_status !== 'active') throw new Error('Negotiation open failed');
  });

  // 12. Alternating Counter-Offer
  await test('Seller (Rahul) Submits Alternating Counter-Offer', async () => {
    negotiation = await req(`/negotiations/${negotiation._id}/offer`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${rahulToken}` },
      body: JSON.stringify({ amount: 7000 }),
    });
    const lastOffer = negotiation.offers[negotiation.offers.length - 1];
    if (lastOffer.amount !== 7000) throw new Error('Counter-offer failed');
  });

  // 13. Prevent Self-Countering
  await test('Enforce Turn Alternation (Seller cannot counter twice)', async () => {
    let failed = false;
    try {
      await req(`/negotiations/${negotiation._id}/offer`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${rahulToken}` },
        body: JSON.stringify({ amount: 6900 }),
      });
    } catch {
      failed = true;
    }
    if (!failed) throw new Error('System allowed self-countering without waiting for other party!');
  });

  // 14. Accept Offer -> Creates Escrow Order
  let escrowOrder = null;
  await test('Buyer (Amit) Accepts Offer -> Creates Order & Reserves Product', async () => {
    const res = await req(`/negotiations/${negotiation._id}/accept`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${amitToken}` },
    });
    if (!res.order || res.negotiation.negotiation_status !== 'accepted') throw new Error('Acceptance failed');
    escrowOrder = res.order;
  });

  // 15. Verify Product Status Changed to Reserved
  await test('Verify Product Status Changed to Reserved', async () => {
    const prod = await req(`/products/${createdProduct._id}`);
    if (prod.status !== 'reserved') throw new Error(`Product status should be reserved, was ${prod.status}`);
  });

  // 16. Verify Contact is Protected Prior to Payment
  await test('Contact Details Hidden Before Payment', async () => {
    let blocked = false;
    try {
      await req(`/orders/${escrowOrder._id}/contact`, {
        headers: { Authorization: `Bearer ${amitToken}` },
      });
    } catch {
      blocked = true;
    }
    if (!blocked) throw new Error('Contact details were leaked before payment!');
  });

  // 17. Payment & Escrow Verification
  await test('Execute Escrow Payment & Generate Receipt', async () => {
    const payPrep = await req(`/orders/${escrowOrder._id}/pay`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${amitToken}` },
    });
    if (!payPrep.mock) throw new Error('Mock payment not initiated');

    const verify = await req(`/orders/${escrowOrder._id}/verify`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${amitToken}` },
      body: JSON.stringify({ mock: true }),
    });
    if (verify.order.status !== 'paid' || !verify.receipt.receipt_no) throw new Error('Payment verification failed');
  });

  // 18. Verify Contact is Released After Payment
  await test('Contact Details Released to Parties After Payment', async () => {
    const contact = await req(`/orders/${escrowOrder._id}/contact`, {
      headers: { Authorization: `Bearer ${amitToken}` },
    });
    if (!contact.email || !contact.phone) throw new Error('Contact not released after payment');
  });

  // 19. Set Handover Meeting
  await test('Schedule Campus Handover Point', async () => {
    const updated = await req(`/orders/${escrowOrder._id}/meeting`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${amitToken}` },
      body: JSON.stringify({ location: 'Central Library Floor 2 Lounge', time: new Date().toISOString() }),
    });
    if (updated.meeting?.location !== 'Central Library Floor 2 Lounge') throw new Error('Meeting scheduling failed');
  });

  // 20. Mutual Handover Confirmation
  await test('Both Parties Confirm Handover -> Order Completed', async () => {
    // Buyer confirms
    const bRes = await req(`/orders/${escrowOrder._id}/confirm`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${amitToken}` },
    });
    if (!bRes.buyer_confirmed) throw new Error('Buyer confirmation failed');

    // Seller confirms
    const sRes = await req(`/orders/${escrowOrder._id}/confirm`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${rahulToken}` },
    });
    if (sRes.status !== 'completed') throw new Error('Order did not complete after mutual confirmation');
  });

  // 21. Write Verified Purchase Review
  await test('Submit Verified Purchase Review (Updates Seller Rating)', async () => {
    const rev = await req('/reviews', {
      method: 'POST',
      headers: { Authorization: `Bearer ${amitToken}` },
      body: JSON.stringify({
        order_id: escrowOrder._id,
        seller_rating: 5,
        product_quality_rating: 5,
        communication_rating: 5,
        comment: 'Board worked perfectly for my embedded systems lab! Friendly and punctual seller.',
      }),
    });
    if (!rev._id) throw new Error('Review creation failed');
  });

  // 22. Atomic Auction Bidding
  await test('Atomic Live Auction Bidding', async () => {
    const auctions = await req('/auctions');
    if (!auctions || auctions.length === 0) throw new Error('No active auctions to bid on');
    const targetAuction = auctions[0];

    const currentBid = targetAuction.current_highest_bid || targetAuction.starting_price || 100;
    const nextBid = currentBid + 150;

    const bidRes = await req(`/auctions/${targetAuction._id}/bid`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${amitToken}` },
      body: JSON.stringify({ amount: nextBid }),
    });
    if (bidRes.current_highest_bid !== nextBid) throw new Error('Bid update was not atomic');
  });

  console.log('\n========================================================');
  console.log(` E2E Test Results: ${passed}/${total} Tests Passed`);
  console.log('========================================================\n');
}

runTests().catch(console.error);

