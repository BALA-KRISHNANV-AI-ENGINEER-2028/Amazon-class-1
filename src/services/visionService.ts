/**
 * Visual AI Scene Analyzer Service
 * Powered by Google AI Studio Multi-Modal Gemini (2.0 / 3.8 Flash)
 *
 * Captures real-time video frames and analyzes diagrams, physical apparatus,
 * equations, or historical context displayed on the Smart TV screen.
 */

export interface VisualAnnotation {
  label: string;
  significance: string;
}

export interface SceneVisualBreakdown {
  detectedCategory:
    | 'diagram'
    | 'physical_apparatus'
    | 'historical_context'
    | 'mathematical_proof'
    | 'microscopic_structure';
  title: string;
  primaryElement: string;
  detailedBreakdown: string;
  keyAnnotations: VisualAnnotation[];
  pedagogicalSignificance: string;
  source?: 'gemini-vision' | 'curated-vision';
  generatedAt?: string;
}

export interface VisualSceneRequest {
  courseTitle: string;
  chapterTitle: string;
  timestampSeconds: number;
  transcriptSnippet?: string;
  imageBase64?: string | null;
  mimeType?: string;
  fallbackData?: Partial<SceneVisualBreakdown>;
}

const DOMAIN_FALLBACKS: Record<string, SceneVisualBreakdown> = {
  quantum: {
    detectedCategory: 'diagram',
    title: 'Unitary Bloch Sphere Phase Space',
    primaryElement: 'Single-Qubit State Vector |ψ⟩ = cos(θ/2)|0⟩ + e^(iφ)sin(θ/2)|1⟩',
    detailedBreakdown:
      'Geometric representation of quantum state superposition. Notice the equatorial projection where relative phase φ determines constructive or destructive interference during measurement.',
    keyAnnotations: [
      { label: 'North Pole |0⟩', significance: 'Ground state eigenvector with eigenvalue +1' },
      { label: 'Equatorial Ring', significance: 'Maximum coherence superposition zone prone to dephasing noise' },
      { label: 'State Vector Arrow', significance: 'Current trajectory undergoing microwave Ramsey resonance pulse' },
    ],
    pedagogicalSignificance:
      'Mastering Bloch sphere geometry enables intuitive debugging of multi-qubit Hadamard and CNOT gate sequences before compiler synthesis.',
    source: 'curated-vision',
    generatedAt: new Date().toISOString(),
  },
  ai: {
    detectedCategory: 'diagram',
    title: 'Scaled Dot-Product Attention Heatmap',
    primaryElement: 'Softmax(QK^T / √d_k) Weight Matrix',
    detailedBreakdown:
      'Displays cross-token attention intensity across multiple heads. Deep gold clusters highlight long-range syntactic dependencies between non-adjacent tokens.',
    keyAnnotations: [
      { label: 'Query-Key Dot Product', significance: 'Measures pairwise cosine similarity in high-dimensional latent space' },
      { label: '√d_k Scaling Factor', significance: 'Prevents gradient vanishing in extreme softmax saturation regions' },
      { label: 'Attention Heads 1-8', significance: 'Specialized sub-spaces capturing morphology and co-reference' },
    ],
    pedagogicalSignificance:
      'Visualizing attention dispersion allows researchers to diagnose hallucination triggers and context window attention degradation.',
    source: 'curated-vision',
    generatedAt: new Date().toISOString(),
  },
  science: {
    detectedCategory: 'diagram',
    title: 'Curved Spacetime Geodesic Grid',
    primaryElement: 'Schwarzschild Metric Light-Cone Tilting',
    detailedBreakdown:
      'Visualizes gravitational time dilation near the event horizon. Null geodesics tilt inward, demonstrating that all future-directed paths terminate at the central curvature singularity.',
    keyAnnotations: [
      { label: 'Event Horizon r_s', significance: 'Radius 2GM/c^2 where escape velocity equals light speed' },
      { label: 'Photon Sphere (1.5 r_s)', significance: 'Unstable circular orbit for trapped relativistic photons' },
      { label: 'Accretion Disk Doppler Boost', significance: 'Asymmetric blue-shifted flux from material approaching observer' },
    ],
    pedagogicalSignificance:
      'Essential for understanding how gravitational wave interferometers like LIGO detect compact binary inspiral mergers.',
    source: 'curated-vision',
    generatedAt: new Date().toISOString(),
  },
  bio: {
    detectedCategory: 'microscopic_structure',
    title: 'CRISPR-Cas Ribonucleoprotein Complex',
    primaryElement: 'Target DNA R-Loop Unwinding by Guide RNA (gRNA)',
    detailedBreakdown:
      'Displays the ternary structure of Cas endonuclease bound to 20-nucleotide target spacer. Shows the conformational shift triggering twin catalytic domain cleavage.',
    keyAnnotations: [
      { label: 'PAM Recognition Site', significance: '5′-NGG-3′ motif essential for initial Cas interrogation' },
      { label: 'HNH Catalytic Domain', significance: 'Cleaves the target DNA strand complementary to guide RNA' },
      { label: 'RuvC Domain', significance: 'Hydrolyzes the non-target displaced DNA strand' },
    ],
    pedagogicalSignificance:
      'Crucial for designing high-fidelity guide RNAs that minimize off-target double-stranded breaks in synthetic therapeutics.',
    source: 'curated-vision',
    generatedAt: new Date().toISOString(),
  },
  robotics: {
    detectedCategory: 'physical_apparatus',
    title: 'Autonomous LiDAR 3D Point Cloud Voxel Map',
    primaryElement: 'Real-Time Octree Voxel Grid with Kalman Pose Estimate',
    detailedBreakdown:
      'Depicts high-density 360-degree range returns mapped into localized obstacle boundaries. Highlights dynamic moving vehicles in bounding boxes.',
    keyAnnotations: [
      { label: 'Dynamic Bounding Box', significance: 'Classified moving agent with predicted 3-second trajectory spline' },
      { label: 'Traversable Ground Plane', significance: 'RANSAC-segmented road surface available for ego-path planning' },
      { label: 'Uncertainty Ellipsoid', significance: 'Covariance matrix from fused IMU and wheel odometry' },
    ],
    pedagogicalSignificance:
      'Forms the sensory perception backbone for state estimation and reactive collision avoidance in autonomous mobile robots.',
    source: 'curated-vision',
    generatedAt: new Date().toISOString(),
  },
};

/**
 * Captures a video frame from the current DOM <video> element as base64 JPEG data URL.
 */
export function captureVideoElementSnapshot(videoSelector = 'video'): string | null {
  if (typeof document === 'undefined') return null;
  try {
    const video = document.querySelector<HTMLVideoElement>(videoSelector);
    if (!video || video.videoWidth === 0 || video.videoHeight === 0) {
      return null;
    }
    const canvas = document.createElement('canvas');
    const targetWidth = Math.min(640, video.videoWidth);
    const scale = targetWidth / video.videoWidth;
    canvas.width = targetWidth;
    canvas.height = Math.round(video.videoHeight * scale);

    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL('image/jpeg', 0.75);
  } catch {
    return null;
  }
}

/**
 * Determines domain category key from course metadata
 */
export function getDomainFallbackKey(courseTitle = '', category = ''): string {
  const lower = `${courseTitle} ${category}`.toLowerCase();
  if (lower.includes('quantum') || lower.includes('qubit') || lower.includes('superposition')) return 'quantum';
  if (lower.includes('neural') || lower.includes('transformer') || lower.includes('ai') || lower.includes('model')) return 'ai';
  if (lower.includes('astro') || lower.includes('cosmos') || lower.includes('space') || lower.includes('physics')) return 'science';
  if (lower.includes('bio') || lower.includes('crispr') || lower.includes('gene')) return 'bio';
  if (lower.includes('robot') || lower.includes('autonomous') || lower.includes('lidar')) return 'robotics';
  return 'quantum';
}

/**
 * Analyzes the current video frame via Gemini multi-modal endpoint
 */
export async function analyzeVisualScene(
  request: VisualSceneRequest
): Promise<SceneVisualBreakdown> {
  const fallbackKey = getDomainFallbackKey(request.courseTitle);
  const fallback = DOMAIN_FALLBACKS[fallbackKey] || DOMAIN_FALLBACKS.quantum;

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 12000);

    const response = await fetch('/api/ai/vision-scene-analysis', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      signal: controller.signal,
      body: JSON.stringify({
        ...request,
        fallbackData: fallback,
      }),
    });
    clearTimeout(timer);

    if (!response.ok) {
      throw new Error(`Vision API error ${response.status}`);
    }

    const data: SceneVisualBreakdown = await response.json();
    return {
      ...fallback,
      ...data,
      source: data.source || 'gemini-vision',
      generatedAt: data.generatedAt || new Date().toISOString(),
    };
  } catch {
    return {
      ...fallback,
      source: 'curated-vision',
      generatedAt: new Date().toISOString(),
    };
  }
}
