const BASE_URL = 'https://coastwatch.pfeg.noaa.gov/erddap/griddap/NOAA_DHW.csv';

const fetchWithRetry = async (url, signal, retries = 1) => {
  try {
    const response = await fetch(url, { signal });
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    return await response.text();
  } catch (error) {
    if (error.name === 'AbortError') throw error;
    if (retries > 0) {
      await new Promise((resolve) => setTimeout(resolve, 3000));
      return fetchWithRetry(url, signal, retries - 1);
    }
    throw error;
  }
};

async function run() {
  const lat = -18.0;
  const lon = 147.0;
  const getUrl = (variable, time) => 
    `${BASE_URL}?${variable}[${time}][(${lat}):1:(${lat})][(${lon}):1:(${lon})]`;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);
    const signal = controller.signal;

    console.log('Fetching DHW...');
    const dhwCsv = await fetchWithRetry(getUrl('CRW_DHW', '(last)'), signal);
    console.log('DHW CSV:', dhwCsv);
    
    console.log('Fetching trend...');
    const trendCsv = await fetchWithRetry(getUrl('CRW_DHW', '(last-30days):(last)'), signal);
    console.log('Trend CSV:', trendCsv);

    clearTimeout(timeoutId);
  } catch (e) {
    console.error('Error:', e);
  }
}

run();
