export const getRiskLevel = (dhw, baa) => {
  if (dhw > 8 || baa >= 3) return { label: "HIGH RISK", color: "#e74c3c" };
  if (dhw >= 4) return { label: "MODERATE", color: "#f39c12" };
  return { label: "LOW RISK", color: "#2ecc71" };
};

export const getBleachingProbability = (dhw, baa, sst, sstAnomaly) => {
  const prob = Math.min((dhw / 12) * 100, 99).toFixed(1);
  
  // ─────────────────────────────────────────────
  // TODO Phase 2 — ML Model Integration
  // Replace the rule-based logic above with:
  //   import * as ort from 'onnxruntime-web'
  //   const session = await ort.InferenceSession.create('./model.onnx')
  //   const feeds = { input: new ort.Tensor('float32', [DHW, SST, SSTANOMALY, BAA]) }
  //   const results = await session.run(feeds)
  //   risk = results.output.data[0]       // risk class
  //   probability = results.proba.data[0] // bleaching probability
  // OR connect to FastAPI endpoint:
  //   POST /predict with body { DHW, SST, SSTANOMALY, BAA }
  // ─────────────────────────────────────────────
  
  return prob;
};
