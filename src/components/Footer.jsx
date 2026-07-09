import React from 'react';

export function Footer() {
  return (
    <footer style={{
      marginTop:    8,
      paddingTop:   12,
      paddingBottom: 12,
      borderTop:    '1px solid var(--bd)',
      textAlign:    'center',
      fontFamily:   'var(--font-body)',
      fontSize:     12,
      color:        'var(--tx2)',
      lineHeight:   1.7,
    }}>
      <p style={{ margin: 0 }}>
        Data:{' '}
        <span style={{ color: '#00b4d8' }}>Global Coral Reef Monitoring Network</span>
        {' '}· 1980–2020 · 41,361 reef survey records
      </p>
      <p style={{ margin: '2px 0 0' }}>
        ML Model:{' '}
        <span style={{ color: '#00b4d8' }}>Random Forest Classifier</span>
        {' '}· Backend: FastAPI · Frontend: React + Recharts + Leaflet
      </p>
    </footer>
  );
}
