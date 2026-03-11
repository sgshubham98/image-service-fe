import { GenerationParams, GeneratedImage } from "../types";

// Simulates calling an image generation API.
// Uses picsum.photos with deterministic seeds to mimic real output.
export async function generateImages(params: GenerationParams): Promise<GeneratedImage[]> {
  const { numImages, seed, width, height } = params;

  const baseSeed = seed !== null ? seed : Math.floor(Math.random() * 100000);

  const images: GeneratedImage[] = [];

  for (let i = 0; i < numImages; i++) {
    // Simulate network delay
    await new Promise((r) => setTimeout(r, 300 + Math.random() * 400));
    const imageSeed = baseSeed + i * 37;
    const url = `https://picsum.photos/seed/${imageSeed}/${width}/${height}`;
    images.push({
      id: `${Date.now()}-${i}`,
      url,
      selected: false,
    });
  }

  return images;
}
