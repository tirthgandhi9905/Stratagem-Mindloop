const MEET_HOST = 'meet.google.com'
const CODE_PATTERN = /^[a-z]{3}-[a-z]{4}-[a-z]{3}$/i
const CONDENSED_PATTERN = /^[a-z]{10,12}$/i

const normalizeUrl = (rawUrl) => {
	if (rawUrl instanceof URL) {
		return rawUrl
	}

	try {
		return new URL(rawUrl)
	} catch (error) {
		return null
	}
}

const hasMeetingPath = (pathname) => {
	const trimmed = pathname.replace(/^\/+|\/+$/g, '')
	if (!trimmed) {
		return false
	}

	const [firstSegment] = trimmed.split('/')
	return CODE_PATTERN.test(firstSegment) || CONDENSED_PATTERN.test(firstSegment)
}

export const isMeetPage = (rawUrl = window.location.href) => {
	const url = normalizeUrl(rawUrl)
	if (!url) {
		return false
	}

	return url.hostname === MEET_HOST && hasMeetingPath(url.pathname)
}
