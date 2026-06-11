type SessionLike = { user?: { role?: string; hospitalId?: string | null } } | null;

export function ownsHospital(session: SessionLike, hospitalId: string): boolean {
  const hid = session?.user?.hospitalId;
  return !!hid && hid === hospitalId;
}

export function ownsBooking(session: SessionLike, bookingHospitalId: string): boolean {
  const hid = session?.user?.hospitalId;
  return !!hid && hid === bookingHospitalId;
}
