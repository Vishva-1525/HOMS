const base = import.meta.env.BASE_URL

/** Compact emblem for UI chrome (~40KB). Keep full PNG for print/high-res if needed. */
export const SVCE_EMBLEM_URL = `${base}svce-emblem-128.png`
export const SVCE_EMBLEM_FULL_URL = `${base}svce-emblem.png`
export const SVCE_CAMPUS_DAY_URL = `${base}svce-campus-day.jpg`
export const SVCE_CAMPUS_NIGHT_URL = `${base}svce-campus-night.jpg`
/** @deprecated Prefer SVCE_CAMPUS_DAY_URL / SVCE_CAMPUS_NIGHT_URL */
export const SVCE_CAMPUS_BG_URL = SVCE_CAMPUS_DAY_URL
export const SVCE_LOGIN_BG_URL = `${base}svce-login-bg.jpg`

export const SVCE_COLLEGE_NAME = 'Sri Venkateswara College of Engineering'
export const SVCE_APP_NAME = 'Hostel Outpass Management System'
export const SVCE_APP_SHORT = 'HOMS'
