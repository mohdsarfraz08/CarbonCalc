// === Detailed Analysis Charts ===

document.addEventListener('DOMContentLoaded', () => {
    // Sample data – Replace with actual dynamic data later
    const monthlyData = [150, 180, 160, 200, 170, 140, 130, 160, 175, 180, 190, 200];
    const trendData = [500, 530, 520, 540, 530, 510, 480, 460, 470, 490, 500, 510];
    const globalComparison = {
      India: 1900,
      USA: 16000,
      China: 7000,
      Germany: 9000,
      User: parseFloat(localStorage.getItem('carbonResults') 
               ? JSON.parse(localStorage.getItem('carbonResults')).total.toFixed(2)
               : 0)
    };
    const sourceData = [40, 30, 20, 10]; // Transport, Home, Food, Other
  
    const chartOptions = {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } }
    };
  
    // Monthly Comparison
    new Chart(document.getElementById('monthlyComparisonChart'), {
      type: 'bar',
      data: {
        labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
                 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
        datasets: [{
          label: 'Emissions (kg CO₂e)',
          data: monthlyData,
          backgroundColor: '#007bff'
        }]
      },
      options: chartOptions
    });
  
    // Emission Trend
    new Chart(document.getElementById('monthlyTrendChart'), {
      type: 'line',
      data: {
        labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
                 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
        datasets: [{
          label: 'Monthly Emissions (kg CO₂e)',
          data: trendData,
          borderColor: '#28a745',
          backgroundColor: 'rgba(40,167,69,0.2)',
          fill: true,
          tension: 0.3
        }]
      },
      options: chartOptions
    });
  
    // Global Comparison
    new Chart(document.getElementById('globalComparisonChart'), {
      type: 'bar',
      data: {
        labels: Object.keys(globalComparison),
        datasets: [{
          label: 'Annual CO₂ Emissions (kg)',
          data: Object.values(globalComparison),
          backgroundColor: ['#ff6384', '#36a2eb', '#ffce56', '#4bc0c0', '#dc3545']
        }]
      },
      options: chartOptions
    });
  
    // Emission Sources
    new Chart(document.getElementById('emissionSourcesChart'), {
      type: 'doughnut',
      data: {
        labels: ['Transport', 'Home', 'Food', 'Other'],
        datasets: [{
          data: sourceData,
          backgroundColor: ['#007bff', '#ffc107', '#dc3545', '#6c757d']
        }]
      },
      options: {
        ...chartOptions,
        cutout: '60%'
      }
    });
  });
  

  