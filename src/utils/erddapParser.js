export const parseSinglePointData = (csvText) => {
  const lines = csvText.trim().split('\n');
  if (lines.length < 3) throw new Error("Invalid CSV format");
  
  // Row 0 is headers, Row 1 is units, Row 2 is data
  const dataRow = lines[2].split(',');
  return parseFloat(dataRow[dataRow.length - 1]);
};

export const parseTrendData = (csvText) => {
  const lines = csvText.trim().split('\n');
  if (lines.length < 3) throw new Error("Invalid CSV format");
  
  const trend = [];
  // Skip row 0 and 1
  for (let i = 2; i < lines.length; i++) {
    const cols = lines[i].split(',');
    if (cols.length > 0) {
      const timeStr = cols[0]; // e.g. "2023-10-15T12:00:00Z"
      const date = new Date(timeStr);
      const val = parseFloat(cols[cols.length - 1]);
      if (!isNaN(val)) {
        trend.push({
          date: `${date.getMonth() + 1}/${date.getDate()}`,
          dhw: val
        });
      }
    }
  }
  return trend;
};
