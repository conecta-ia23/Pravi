import { useEffect, useState } from 'react';
// Cambia esta constante por la URL real de tu webhook n8n
const WEBHOOK_URL = '';

function Cotizacion() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(WEBHOOK_URL)
      .then(response => response.json())
      .then(json => {
        setData(json);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  if (loading) return <p>Cargando...</p>;

  if (!data.length) return <p>No hay datos.</p>;

  // Tomar las claves de la primera fila como encabezados
  const headers = Object.keys(data[0]);

  return (
    <table>
      <thead>
        <tr>
          {headers.map(header => (
            <th key={header}>{header}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {data.map((row, idx) => (
          <tr key={idx}>
            {headers.map(key => (
              <td key={key}>{row[key]}</td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export default Cotizacion;
