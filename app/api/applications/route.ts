import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getApplicationStore, type ApplicationStatus } from '@/lib/applications/store';
import { SESSION_COOKIE_NAME, verifySessionToken } from '@/lib/auth/session';

export async function GET(request: Request) {
  try {
    const cookieStore = await cookies();
    const sessionToken = cookieStore.get(SESSION_COOKIE_NAME)?.value;
    const session = verifySessionToken(sessionToken);

    const { searchParams } = new URL(request.url);
    const filterUserId = searchParams.get('userId');
    const filterSchemeId = searchParams.get('schemeId');
    const filterStatus = searchParams.get('status') as ApplicationStatus | null;
    const includeStats = searchParams.get('stats') === 'true';

    const store = getApplicationStore();

    // If admin is requesting, they can see all or filtered
    if (session?.role === 'admin') {
      const applications = store.listApplications({
        userId: filterUserId ?? undefined,
        schemeId: filterSchemeId ?? undefined,
        status: filterStatus ?? undefined,
      });

      const stats = includeStats ? store.getStats() : undefined;

      return NextResponse.json({
        applications,
        stats,
        total: applications.length,
      });
    }

    // If regular citizen is requesting, only return their applications
    if (session) {
      const userApps = store.listApplications({
        userId: session.id,
      });

      const totalPersonalBenefit = userApps.reduce(
        (acc, app) => acc + (app.estimatedAnnualBenefit || 0),
        0
      );
      const approvedPersonalBenefit = userApps
        .filter((a) => a.status === 'approved' || a.status === 'benefit_received')
        .reduce((acc, app) => acc + (app.estimatedAnnualBenefit || 0), 0);

      return NextResponse.json({
        applications: userApps,
        totalPersonalBenefit,
        approvedPersonalBenefit,
        total: userApps.length,
      });
    }

    // Guest mode
    return NextResponse.json({
      applications: [],
      totalPersonalBenefit: 0,
      approvedPersonalBenefit: 0,
      total: 0,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to fetch applications' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const cookieStore = await cookies();
    const sessionToken = cookieStore.get(SESSION_COOKIE_NAME)?.value;
    const session = verifySessionToken(sessionToken);

    const body = await request.json();
    const {
      schemeId,
      schemeName,
      category,
      benefitType,
      benefitHighlight,
      estimatedAnnualBenefit,
      status,
      applicationRefNumber,
      notes,
      guestName,
      guestEmail,
      guestState,
      guestOccupation,
    } = body;

    if (!schemeId || !schemeName) {
      return NextResponse.json(
        { error: 'Scheme ID and Scheme Name are required' },
        { status: 400 }
      );
    }

    // Determine user identifier
    const userId = session?.id ?? `guest-${guestEmail || 'anonymous'}`;
    const userName = session?.name ?? guestName ?? 'Citizen (Guest)';
    const userEmail = session?.email ?? guestEmail ?? 'guest@citizen.in';
    const userState = guestState ?? 'Maharashtra';
    const userOccupation = guestOccupation ?? 'citizen';

    const store = getApplicationStore();
    const application = store.createApplication({
      userId,
      userName,
      userEmail,
      userState,
      userOccupation,
      schemeId,
      schemeName,
      category: category ?? 'general',
      benefitType: benefitType ?? 'grant',
      benefitHighlight: benefitHighlight ?? {
        en: 'Financial & Social Benefit',
        hi: 'वित्तीय व सामाजिक लाभ',
        mr: 'आर्थिक व सामाजिक लाभ',
      },
      estimatedAnnualBenefit: Number(estimatedAnnualBenefit) || 10000,
      status: (status as ApplicationStatus) ?? 'applied',
      applicationRefNumber,
      notes,
    });

    return NextResponse.json({ application, success: true }, { status: 201 });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to record application' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request) {
  try {
    const cookieStore = await cookies();
    const sessionToken = cookieStore.get(SESSION_COOKIE_NAME)?.value;
    const session = verifySessionToken(sessionToken);

    if (session?.role !== 'admin') {
      return NextResponse.json(
        { error: 'Unauthorized: Only administrators can update application statuses' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { id, status, notes } = body;

    if (!id || !status) {
      return NextResponse.json(
        { error: 'Application ID and Status are required' },
        { status: 400 }
      );
    }

    const store = getApplicationStore();
    const updated = store.updateStatus(id, status as ApplicationStatus, notes);

    if (!updated) {
      return NextResponse.json({ error: 'Application not found' }, { status: 404 });
    }

    return NextResponse.json({ application: updated, success: true });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to update application' },
      { status: 500 }
    );
  }
}
