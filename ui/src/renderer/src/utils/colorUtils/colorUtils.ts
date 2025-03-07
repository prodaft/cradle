export class GoldenRatioColorGenerator {
  // Current hue value in the range [0, 1)
  private hue: number;
  // Golden ratio conjugate used to distribute hues evenly
  private readonly goldenRatioConjugate: number = 0.618033988749895;

  /**
   * Creates an instance of the color generator.
   * @param saturation Saturation value (0 to 1). Default is 0.5.
   * @param lightness Lightness value (0 to 1). Default is 0.5.
   */
  constructor(private saturation: number = 0.5, private lightness: number = 0.5) {
    // Initialize with a random hue value
    this.hue = Math.random();
  }

  /**
   * Converts an HSL color value to RGB.
   * Conversion formula adapted from http://www.rapidtables.com/convert/color/hsl-to-rgb.htm
   * Assumes h is in [0, 360], s and l are in [0, 1] and returns r, g, b in [0, 255].
   * @param h Hue value in degrees
   * @param s Saturation in [0, 1]
   * @param l Lightness in [0, 1]
   * @returns An array with r, g, b values.
   */
  private hslToRgb(h: number, s: number, l: number): [number, number, number] {
    h = h / 360; // normalize hue to be between 0 and 1

    let r: number, g: number, b: number;

    if (s === 0) {
      // Achromatic, i.e. gray
      r = g = b = l;
    } else {
      const hue2rgb = (p: number, q: number, t: number): number => {
        if (t < 0) t += 1;
        if (t > 1) t -= 1;
        if (t < 1/6) return p + (q - p) * 6 * t;
        if (t < 1/2) return q;
        if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
        return p;
      };

      const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
      const p = 2 * l - q;
      r = hue2rgb(p, q, h + 1/3);
      g = hue2rgb(p, q, h);
      b = hue2rgb(p, q, h - 1/3);
    }

    // Convert to 0-255 range and return
    return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
  }

  /**
   * Converts an RGB color value to a hex string.
   * @param r Red value (0-255)
   * @param g Green value (0-255)
   * @param b Blue value (0-255)
   * @returns A hexadecimal color string.
   */
  private rgbToHex(r: number, g: number, b: number): string {
    const toHex = (n: number): string => {
      const hex = n.toString(16);
      return hex.length === 1 ? '0' + hex : hex;
    };
    return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
  }

  /**
   * Generates and returns the next color as a hex string.
   * @returns A hex color string.
   */
  public nextHexColor(): string {
    // Convert current hue to degrees
    const h = Math.floor(this.hue * 360);
    const rgb = this.hslToRgb(h, this.saturation, this.lightness);
    const hexColor = this.rgbToHex(...rgb);

    // Update hue for the next color using the golden ratio conjugate
    this.hue = (this.hue + this.goldenRatioConjugate) % 1;
    return hexColor;
  }
}
