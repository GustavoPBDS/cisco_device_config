/**
 * Converts an IPv4 address string to its 32-bit integer representation.
 * @param ip The IPv4 address string (e.g., "192.168.1.1").
 * @returns The numeric representation of the IP address.
 */
export const ipToLong = (ip: string): number => {
    return ip.split('.').reduce((acc, octet) => (acc << 8) + parseInt(octet, 10), 0) >>> 0;
};

/**
 * Converts a 32-bit integer representation of an IP address back to its string format.
 * @param long The numeric representation of the IP address.
 * @returns The IPv4 address string.
 */
export const longToIp = (long: number): string => {
    return [(long >>> 24), (long >>> 16) & 255, (long >>> 8) & 255, long & 255].join('.');
};

/**
 * Validates if a given string is a valid subnet mask.
 * @param mask The subnet mask string (e.g., "255.255.255.0").
 * @returns True if the mask is valid, false otherwise.
 */
export function isValidMask(mask: string): boolean {
    const octets = mask.split('.').map(Number);
    if (octets.length !== 4 || octets.some(o => o < 0 || o > 255 || isNaN(o))) return false;
    const binaryString = octets.map(o => o.toString(2).padStart(8, '0')).join('');
    // A valid mask is a sequence of 1s followed by a sequence of 0s.
    return /^1*0*$/.test(binaryString);
}

/**
 * Calculates network information based on an IP address and a subnet mask.
 * @param ip The IPv4 address string.
 * @param mask The subnet mask string.
 * @returns An object with network details or null if the inputs are invalid.
 */
export function getNetworkInfo(ip: string, mask: string) {
    if (!ip || !mask || !isValidMask(mask)) return null;
    try {
        const ipLong = ipToLong(ip);
        const maskLong = ipToLong(mask);
        const networkLong = ipLong & maskLong;
        const broadcastLong = (networkLong | (~maskLong & 0xFFFFFFFF)) >>> 0;
        const cidr = mask.split('.').reduce((acc, octet) => acc + (parseInt(octet).toString(2).match(/1/g) || []).length, 0);
        const totalHosts = Math.pow(2, 32 - cidr);
        return {
            networkAddress: longToIp(networkLong),
            broadcastAddress: longToIp(broadcastLong),
            gateway: longToIp(networkLong + 1), // Conventionally the first usable IP
            usableHosts: totalHosts > 2 ? totalHosts - 2 : 0,
        };
    } catch (e) {
        return null;
    }
}
