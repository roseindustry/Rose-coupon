function getSubdomain() {
    // Split the hostname on '.'
    const host = window.location.hostname;
    let subdomain = host.split('.');
    // Check if running locally (localhost scenario)
    if (host.includes('localhost')) {
        // Assuming the URL structure is: [subdomain].localhost[:port]
        // The subdomain will be the first part
        return subdomain[0];
    } else {
        // For production, assuming URL structure is: [subdomain].[domain].[TLD]
        // Check if there are at least 3 parts; if so, return the first part as the subdomain
        return subdomain.length > 2 ? subdomain[0] : null;
    }
}

// Named export
export { getSubdomain };