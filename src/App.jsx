import { useState, useEffect } from 'react';
import './App.css';
import publicHolidays from './publicHolidays.json';
import logo from './assets/logo.png';

function App() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [attendance, setAttendance] = useState(() => {
    const savedAttendance = localStorage.getItem('attendance');
    return savedAttendance ? JSON.parse(savedAttendance) : {};
  });
  const [theme, setTheme] = useState(() => {
    const savedTheme = localStorage.getItem('theme');
    return savedTheme || 'light';
  });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStatus, setDragStatus] = useState(null);
  const [selectedRegion, setSelectedRegion] = useState(() => {
    const savedRegion = localStorage.getItem('selectedRegion');
    return savedRegion || 'Vic';
  });
  const [showLocationDropdown, setShowLocationDropdown] = useState(false);
  const [showWelcomeMessage, setShowWelcomeMessage] = useState(() => {
    const hasSeenWelcome = localStorage.getItem('hasSeenWelcome');
    return !hasSeenWelcome;
  });
  const [showSettingsPanel, setShowSettingsPanel] = useState(false);
  const [targetPercentage, setTargetPercentage] = useState(() => {
    const savedTarget = localStorage.getItem('targetPercentage');
    return savedTarget ? parseInt(savedTarget) : 50; // Default is 50% for existing users
  });

  useEffect(() => {
    localStorage.setItem('attendance', JSON.stringify(attendance));
  }, [attendance]);

  useEffect(() => {
    localStorage.setItem('theme', theme);
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  useEffect(() => {
    localStorage.setItem('selectedRegion', selectedRegion);
  }, [selectedRegion]);

  useEffect(() => {
    localStorage.setItem('targetPercentage', targetPercentage.toString());
  }, [targetPercentage]);

  // Automatically mark public holidays as holiday status
  useEffect(() => {
    const updatedAttendance = { ...attendance };

    // Get all public holiday dates from ALL regions
    const allPublicHolidayDates = new Set();
    Object.keys(publicHolidays).forEach(region => {
      const holidays = publicHolidays[region]?.['2026'] || [];
      holidays.forEach(holiday => {
        allPublicHolidayDates.add(holiday.date);
      });
    });

    // Remove all holidays that match ANY public holiday date from ALL regions
    Object.keys(updatedAttendance).forEach(dateKey => {
      if (updatedAttendance[dateKey] === 'holiday') {
        const [year, month, day] = dateKey.split('-').map(Number);
        const dateString = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

        // If this holiday date matches any public holiday in any region, remove it
        if (allPublicHolidayDates.has(dateString)) {
          delete updatedAttendance[dateKey];
        }
      }
    });

    // Now add the current region's holidays
    const regionHolidays = publicHolidays[selectedRegion]?.['2026'] || [];
    regionHolidays.forEach(holiday => {
      const [year, month, day] = holiday.date.split('-').map(Number);
      const date = new Date(year, month - 1, day);
      const dayOfWeek = date.getDay();
      const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

      // Only mark as holiday if it's not a weekend
      if (!isWeekend) {
        const dateKey = `${year}-${month - 1}-${day}`;
        updatedAttendance[dateKey] = 'holiday';
      }
    });

    setAttendance(updatedAttendance);
  }, [selectedRegion]);

  const getDaysInMonth = (date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    return { daysInMonth, startingDayOfWeek, year, month };
  };

  const markAttendance = (day, type) => {
    const dateKey = `${currentDate.getFullYear()}-${currentDate.getMonth()}-${day}`;

    setAttendance(prev => ({
      ...prev,
      [dateKey]: type
    }));
  };

  const cycleAttendance = (day) => {
    const currentStatus = getAttendanceStatus(day);
    let newStatus;

    if (!currentStatus) {
      newStatus = 'office';
    } else if (currentStatus === 'office') {
      newStatus = 'holiday';
    } else {
      newStatus = null;
    }

    markAttendance(day, newStatus);
  };

  const getAttendanceStatus = (day) => {
    const dateKey = `${currentDate.getFullYear()}-${currentDate.getMonth()}-${day}`;
    return attendance[dateKey];
  };

  const changeMonth = (offset) => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + offset, 1));
  };

  const handleMouseDown = (day) => {
    if (isWeekend(day)) return;

    // Also prevent dragging on public holidays
    const publicHolidayName = getPublicHolidayName(day, currentDate.getMonth(), currentDate.getFullYear());
    if (publicHolidayName) return;

    const currentStatus = getAttendanceStatus(day);
    setIsDragging(true);
    setDragStatus(currentStatus);
  };

  const handleMouseEnter = (day) => {
    if (!isDragging || isWeekend(day)) return;

    // Also skip public holidays during drag
    const publicHolidayName = getPublicHolidayName(day, currentDate.getMonth(), currentDate.getFullYear());
    if (publicHolidayName) return;

    markAttendance(day, dragStatus);
  };

  const handleMouseUp = () => {
    setIsDragging(false);
    setDragStatus(null);
  };

  const getPublicHolidayName = (day, month, year) => {
    const dateString = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const regionHolidays = publicHolidays[selectedRegion]?.['2026'] || [];
    const holiday = regionHolidays.find(h => h.date === dateString);
    return holiday?.name || null;
  };

  const handleRegionSelect = (region) => {
    setSelectedRegion(region);
    setShowLocationDropdown(false);
  };

  const handleCloseWelcome = () => {
    localStorage.setItem('hasSeenWelcome', 'true');
    setShowWelcomeMessage(false);
  };

  const { daysInMonth, startingDayOfWeek, year, month } = getDaysInMonth(currentDate);

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  // Check if viewing current or future month
  const isCurrentOrFutureMonth = () => {
    const today = new Date();
    const currentYear = today.getFullYear();
    const currentMonth = today.getMonth();

    return (year > currentYear) || (year === currentYear && month >= currentMonth);
  };

  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  const isWeekend = (day) => {
    const date = new Date(year, month, day);
    const dayOfWeek = date.getDay();
    return dayOfWeek === 0 || dayOfWeek === 6;
  };

  const renderCalendar = () => {
    const days = [];

    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(<div key={`empty-${i}`} className="calendar-day empty"></div>);
    }

    for (let day = 1; day <= daysInMonth; day++) {
      const status = getAttendanceStatus(day);
      const publicHolidayName = getPublicHolidayName(day, month, year);
      const today = new Date();
      const isToday = today.getDate() === day &&
                      today.getMonth() === month &&
                      today.getFullYear() === year;
      const weekend = isWeekend(day);
      const isPublicHoliday = publicHolidayName !== null;

      const currentDate = new Date(year, month, day);
      const todayDate = new Date();
      todayDate.setHours(0, 0, 0, 0);
      currentDate.setHours(0, 0, 0, 0);
      const isFuture = currentDate > todayDate;
      const isPlanned = isFuture && status === 'office';

      // Public holidays are non-editable like weekends
      const isNonEditable = weekend || isPublicHoliday;

      days.push(
        <div
          key={day}
          className={`calendar-day ${isToday ? 'today' : ''} ${weekend ? 'weekend' : ''} ${status ? `has-${status}` : ''} ${isPublicHoliday ? 'public-holiday' : ''} ${isPlanned ? 'planned-office' : ''} ${!isNonEditable ? 'clickable' : ''}`}
          onClick={() => !isNonEditable && cycleAttendance(day)}
          onMouseDown={() => !isNonEditable && handleMouseDown(day)}
          onMouseEnter={() => handleMouseEnter(day)}
          onMouseUp={handleMouseUp}
          title={isPublicHoliday ? `Public Holiday: ${publicHolidayName}` : (!weekend ? (isPlanned ? 'Planned Office Day - Click to change or drag to apply to multiple dates' : 'Click to cycle: Office → Holiday → None, or drag to apply to multiple dates') : '')}
        >
          <div className="day-content">
            <div className="day-number">{day}</div>
            {isPublicHoliday && (
              <div className="holiday-info">
                <div className="holiday-icon">🌴</div>
                <div className="holiday-name">{publicHolidayName}</div>
              </div>
            )}
            {!isPublicHoliday && status && !weekend && (
              <div className={`status-icon ${status}`}>
                {status === 'office' && (isPlanned ? '📅' : '🏢')}
                {status === 'holiday' && '🌴'}
              </div>
            )}
          </div>
        </div>
      );
    }

    return days;
  };

  const getMonthlyStats = () => {
    let actualOffice = 0;
    let plannedOffice = 0;
    let holiday = 0;
    let totalWeekdays = 0;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (let day = 1; day <= daysInMonth; day++) {
      if (!isWeekend(day)) {
        const status = getAttendanceStatus(day);
        if (status !== 'holiday') {
          totalWeekdays++;
        }
        if (status === 'office') {
          // Check if it's a future date (planned) or past/present (actual)
          const currentDateForDay = new Date(year, month, day);
          currentDateForDay.setHours(0, 0, 0, 0);

          if (currentDateForDay > today) {
            plannedOffice++;
          } else {
            actualOffice++;
          }
        }
        if (status === 'holiday') holiday++;
      }
    }

    const workingDays = totalWeekdays;
    const totalOffice = actualOffice + plannedOffice;
    const actualOfficePercentage = workingDays > 0 ? ((actualOffice / workingDays) * 100).toFixed(1) : 0;
    const totalOfficePercentage = workingDays > 0 ? ((totalOffice / workingDays) * 100).toFixed(1) : 0;

    return {
      actualOffice,
      plannedOffice,
      totalOffice,
      holiday,
      workingDays,
      actualOfficePercentage,
      totalOfficePercentage
    };
  };

  const stats = getMonthlyStats();

  const getCurrentOfficeRate = () => {
    const today = new Date();
    const currentMonth = today.getMonth();
    const currentYear = today.getFullYear();
    const lastDay = new Date(currentYear, currentMonth + 1, 0).getDate();

    let actualOffice = 0;
    let plannedOffice = 0;
    let totalWorkingDays = 0;

    // Count all office days (actual and planned)
    for (let day = 1; day <= lastDay; day++) {
      const date = new Date(currentYear, currentMonth, day);
      const dayOfWeek = date.getDay();
      const isWeekendDay = dayOfWeek === 0 || dayOfWeek === 6;

      if (!isWeekendDay) {
        const dateKey = `${currentYear}-${currentMonth}-${day}`;
        const status = attendance[dateKey];

        if (status !== 'holiday') {
          totalWorkingDays++;
        }

        if (status === 'office') {
          const dayDate = new Date(currentYear, currentMonth, day);
          dayDate.setHours(0, 0, 0, 0);
          const todayDate = new Date(today);
          todayDate.setHours(0, 0, 0, 0);

          if (dayDate > todayDate) {
            plannedOffice++;
          } else {
            actualOffice++;
          }
        }
      }
    }

    const totalOffice = actualOffice + plannedOffice;
    const rate = totalWorkingDays > 0 ? ((actualOffice / totalWorkingDays) * 100) : 0;
    const combinedRate = totalWorkingDays > 0 ? ((totalOffice / totalWorkingDays) * 100) : 0;

    return {
      rate: rate.toFixed(1),
      actual: actualOffice,
      planned: plannedOffice,
      total: totalWorkingDays,
      totalOffice: totalOffice,
      combinedRate: combinedRate.toFixed(1)
    };
  };

  const currentRate = getCurrentOfficeRate();

  const getMotivationalMessage = () => {
    const rate = parseFloat(currentRate.rate);
    const today = new Date();
    const currentMonthName = monthNames[today.getMonth()];

    // Calculate days needed to reach target%
    const targetDays = (currentRate.total * targetPercentage) / 100;
    const daysNeeded = Math.ceil(targetDays - currentRate.actual);

    if (rate === 0) {
      return {
        message: `Let's start marking your office days! Goal: ${targetPercentage}% (${currentMonthName})`,
        emoji: "🚀",
        progressEmoji: "😐",
        color: "neutral"
      };
    }

    if (rate >= targetPercentage) {
      return {
        message: `Amazing! You're at ${currentRate.rate}% office attendance in ${currentMonthName}! Target is achieved! Keep it up! 🎉`,
        emoji: "🌟",
        progressEmoji: "😎",
        color: "success"
      };
    } else if (rate >= targetPercentage - 15) {
      const dayWord = daysNeeded === 1 ? 'day' : 'days';
      return {
        message: `Almost there! ${currentRate.rate}% in ${currentMonthName}. Just ${daysNeeded} more ${dayWord} to hit ${targetPercentage}%!`,
        emoji: "💪",
        progressEmoji: "😊",
        color: "warning"
      };
    } else if (rate >= targetPercentage - 30) {
      return {
        message: `Keep going! At ${currentRate.rate}% in ${currentMonthName}. You can reach ${targetPercentage}%!`,
        emoji: "📈",
        progressEmoji: "😐",
        color: "info"
      };
    } else {
      return {
        message: `Let's boost it up! Currently at ${currentRate.rate}% in ${currentMonthName}. Target: ${targetPercentage}%`,
        emoji: "🎯",
        progressEmoji: "😢",
        color: "info"
      };
    }
  };

  const motivationalData = getMotivationalMessage();

  const getHistoricalStats = () => {
    const history = [];
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (let i = 5; i >= 0; i--) {
      const targetDate = new Date(currentYear, currentMonth - i, 1);
      const targetYear = targetDate.getFullYear();
      const targetMonth = targetDate.getMonth();

      const lastDay = new Date(targetYear, targetMonth + 1, 0).getDate();

      let actualOffice = 0;
      let workingDays = 0;

      for (let day = 1; day <= lastDay; day++) {
        const date = new Date(targetYear, targetMonth, day);
        const dayOfWeek = date.getDay();
        const isWeekendDay = dayOfWeek === 0 || dayOfWeek === 6;

        if (!isWeekendDay) {
          const dateKey = `${targetYear}-${targetMonth}-${day}`;
          const status = attendance[dateKey];

          if (status !== 'holiday') {
            workingDays++;
          }
          // Only count actual office days (past or present, not future)
          if (status === 'office') {
            const dayDate = new Date(targetYear, targetMonth, day);
            dayDate.setHours(0, 0, 0, 0);
            if (dayDate <= today) {
              actualOffice++;
            }
          }
        }
      }

      const percentage = workingDays > 0 ? ((actualOffice / workingDays) * 100) : 0;

      history.push({
        month: monthNames[targetMonth],
        year: targetYear,
        monthShort: monthNames[targetMonth].substring(0, 3),
        percentage: percentage,
        office: actualOffice,
        workingDays
      });
    }

    return history;
  };

  const historicalStats = getHistoricalStats();

  const exportAllData = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dayNamesForExport = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

    // Generate CSV content with all attendance data
    let csvContent = `Complete Attendance Report - All Months\n\n`;
    csvContent += `Year,Month,Date,Day,Status\n`;

    // Get all unique year-month combinations from attendance data
    const monthsWithData = new Set();
    Object.keys(attendance).forEach(dateKey => {
      const [year, month] = dateKey.split('-');
      monthsWithData.add(`${year}-${month}`);
    });

    // Sort the months by year and month numerically
    const sortedMonths = Array.from(monthsWithData).sort((a, b) => {
      const [yearA, monthA] = a.split('-').map(Number);
      const [yearB, monthB] = b.split('-').map(Number);

      if (yearA !== yearB) {
        return yearA - yearB;
      }
      return monthA - monthB;
    });

    // Filter out future months
    const currentYear = today.getFullYear();
    const currentMonth = today.getMonth();
    const filteredMonths = sortedMonths.filter(yearMonth => {
      const [year, month] = yearMonth.split('-').map(Number);
      // Only include months that are in the past or current month
      if (year < currentYear) return true;
      if (year === currentYear && month <= currentMonth) return true;
      return false;
    });

    // Calculate monthly statistics
    const monthlyStats = [];

    // Export all months with data (excluding future months)
    filteredMonths.forEach(yearMonth => {
      const [year, month] = yearMonth.split('-').map(Number);
      const lastDay = new Date(year, month + 1, 0).getDate();

      let actualOffice = 0;
      let plannedOffice = 0;
      let holiday = 0;
      let workingDays = 0;

      for (let day = 1; day <= lastDay; day++) {
        const date = new Date(year, month, day);
        const dayOfWeek = date.getDay();
        const dayName = dayNamesForExport[dayOfWeek];
        const isWeekendDay = dayOfWeek === 0 || dayOfWeek === 6;

        const dateKey = `${year}-${month}-${day}`;
        const status = attendance[dateKey];

        // Calculate stats
        if (!isWeekendDay) {
          if (status !== 'holiday') {
            workingDays++;
          }
          if (status === 'office') {
            const dayDate = new Date(year, month, day);
            dayDate.setHours(0, 0, 0, 0);
            if (dayDate > today) {
              plannedOffice++;
            } else {
              actualOffice++;
            }
          }
          if (status === 'holiday') {
            holiday++;
          }
        }

        let statusText = '';
        if (isWeekendDay) {
          statusText = 'Weekend';
        } else if (status === 'office') {
          const dayDate = new Date(year, month, day);
          dayDate.setHours(0, 0, 0, 0);
          if (dayDate > today) {
            statusText = 'Planned Office';
          } else {
            statusText = 'Office';
          }
        } else if (status === 'holiday') {
          statusText = 'Holiday/Leave';
        } else {
          statusText = 'Not Marked';
        }

        // Only add to CSV if not Weekend, Not Marked, or Planned Office
        if (statusText !== 'Weekend' && statusText !== 'Not Marked' && statusText !== 'Planned Office') {
          csvContent += `${year},${monthNames[month]},${day},${dayName},${statusText}\n`;
        }
      }

      // Store monthly stats
      const actualOfficePercentage = workingDays > 0 ? ((actualOffice / workingDays) * 100).toFixed(1) : 0;
      const totalOffice = actualOffice + plannedOffice;
      const totalOfficePercentage = workingDays > 0 ? ((totalOffice / workingDays) * 100).toFixed(1) : 0;

      monthlyStats.push({
        year,
        month: monthNames[month],
        workingDays,
        actualOffice,
        plannedOffice,
        totalOffice,
        holiday,
        actualOfficePercentage,
        totalOfficePercentage
      });
    });

    // Add monthly summary section
    csvContent += `\n\nMonthly Summary\n`;
    csvContent += `Year,Month,Working Days,Actual Office,Holidays,Actual Office %\n`;

    monthlyStats.forEach(stat => {
      csvContent += `${stat.year},${stat.month},${stat.workingDays},${stat.actualOffice},${stat.holiday},${stat.actualOfficePercentage}%\n`;
    });

    // Create blob and download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);

    link.setAttribute('href', url);
    link.setAttribute('download', `Attendance_Complete_Export_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const importAttendanceData = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target.result;
        const lines = content.split('\n');

        // Detect format by checking header
        const isMultiMonthFormat = lines.some(line => line.includes('Year,Month,Date,Day,Status'));

        let dataStartIndex = -1;

        if (isMultiMonthFormat) {
          // Multi-month format
          for (let i = 0; i < lines.length; i++) {
            if (lines[i].includes('Year,Month,Date,Day,Status')) {
              dataStartIndex = i + 1;
              break;
            }
          }
        } else {
          // Single month format
          for (let i = 0; i < lines.length; i++) {
            if (lines[i].includes('Date,Day,Status')) {
              dataStartIndex = i + 1;
              break;
            }
          }
        }

        if (dataStartIndex === -1) {
          alert('Invalid CSV format. Could not find data header.');
          return;
        }

        const newAttendance = { ...attendance };
        let importedCount = 0;

        // Parse attendance data
        for (let i = dataStartIndex; i < lines.length; i++) {
          const line = lines[i].trim();
          if (!line || line.startsWith('Summary')) break;

          const parts = line.split(',').map(s => s.trim());

          let year, month, day, statusText;

          if (isMultiMonthFormat) {
            // Format: Year,Month,Date,Day,Status
            if (parts.length < 5) continue;
            year = parseInt(parts[0]);
            const monthName = parts[1];
            day = parseInt(parts[2]);
            statusText = parts[4];

            // Convert month name to number
            month = monthNames.indexOf(monthName);
            if (month === -1) continue;
          } else {
            // Format: Date,Day,Status (single month)
            if (parts.length < 3) continue;
            day = parseInt(parts[0]);
            statusText = parts[2];

            // Extract year and month from header
            const headerLine = lines[0];
            const headerMatch = headerLine.match(/(\w+)\s+(\d+)/);
            if (headerMatch) {
              const monthName = headerMatch[1];
              year = parseInt(headerMatch[2]);
              month = monthNames.indexOf(monthName);
            } else {
              // Use current date as fallback
              year = currentDate.getFullYear();
              month = currentDate.getMonth();
            }
          }

          if (isNaN(day) || isNaN(year)) continue;

          const dateKey = `${year}-${month}-${day}`;

          // Map status text to our internal status values
          if (statusText === 'Office' || statusText === 'Planned Office') {
            newAttendance[dateKey] = 'office';
            importedCount++;
          } else if (statusText === 'Holiday/Leave') {
            newAttendance[dateKey] = 'holiday';
            importedCount++;
          } else if (statusText === 'Not Marked') {
            // Remove the key if it exists
            if (newAttendance[dateKey]) {
              delete newAttendance[dateKey];
              importedCount++;
            }
          }
          // Weekend entries are ignored as they're calculated dynamically
        }

        setAttendance(newAttendance);
        alert(`Attendance data imported successfully! ${importedCount} entries processed.`);
      } catch (error) {
        console.error('Error parsing CSV:', error);
        alert('Error importing file. Please check the file format.');
      }
    };

    reader.readAsText(file);
    // Reset file input
    event.target.value = '';
  };

  return (
    <div className="app" onMouseUp={handleMouseUp} onMouseLeave={handleMouseUp}>
      {showWelcomeMessage && (
        <div className="welcome-overlay" onClick={handleCloseWelcome}>
          <div className="welcome-modal" onClick={(e) => e.stopPropagation()}>
            <div className="welcome-header">
              <h2>Welcome to InOffice Attendance!</h2>
              <button className="close-button" onClick={handleCloseWelcome}>&times;</button>
            </div>
            <div className="welcome-content">
              <div className="welcome-icon">📍</div>
              <p className="welcome-message">
                Your default location is set to <strong>Victoria, Australia</strong>.
              </p>
              <p className="welcome-info">
                You can change your location anytime using the location selector at the top right.
                If your location isn't in the list, simply select <strong>"No Location"</strong> to use the app without region-specific public holidays.
              </p>
              <p className="welcome-info">
                Your default office attendance target is set to <strong>50%</strong>. You can customize this anytime by clicking the <strong>⚙️ Settings</strong> icon at the top right corner.
              </p>
              <button className="welcome-button" onClick={handleCloseWelcome}>
                Got it, let's start!
              </button>
            </div>
          </div>
        </div>
      )}
      <div className="app-logo">
        <div className="logo-content">
          <img src={logo} alt="InOffice Attendance" className="logo-image" />
          <div className="logo-motivation">
            <span className="logo-motivation-emoji">{motivationalData.emoji}</span>
            <span className="logo-motivation-text">{motivationalData.message}</span>
          </div>
          <div className="header-controls">
          <div className="progress-section">
            <div className="progress-month-name">{monthNames[new Date().getMonth()]}</div>
            <div className="progress-labels">
              <div className="progress-current-group">
                <span className="progress-emoji">{motivationalData.progressEmoji}</span>
                <span className="progress-current">{currentRate.rate}%</span>
              </div>
              <span className="progress-target">Target: {targetPercentage}%</span>
            </div>
            <div className="progress-bar-container">
              <div
                className="progress-bar-fill"
                style={{ width: `${Math.min(parseFloat(currentRate.rate), 100)}%` }}
              />
              <div className="target-marker" style={{ left: `${targetPercentage}%` }} />x
            </div>
            {(() => {
              const targetDays = (currentRate.total * targetPercentage) / 100;
              const totalPlannedAndActual = currentRate.totalOffice;
              const daysNeededToReachTarget = Math.ceil(targetDays - totalPlannedAndActual);
              const combinedRate = parseFloat(currentRate.combinedRate);

              if (combinedRate >= targetPercentage) {
                return (
                  <div className="progress-message success">
                    Good! You have planned your days wisely.
                  </div>
                );
              } else if (daysNeededToReachTarget > 0) {
                const dayWord = daysNeededToReachTarget === 1 ? 'day' : 'days';
                return (
                  <div className="progress-message plan-needed">
                    Plan {daysNeededToReachTarget} more {dayWord} to reach {targetPercentage}% target 📅
                  </div>
                );
              }
              return null;
            })()}
          </div>
          <div className="location-selector">
            <div className="location-toggle" onClick={() => setShowLocationDropdown(!showLocationDropdown)} title="Select location">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                <circle cx="12" cy="10" r="3"></circle>
              </svg>
              <span className="location-label">{selectedRegion}</span>
            </div>
            {showLocationDropdown && (
              <div className="location-dropdown">
                <div className="location-option" onClick={() => handleRegionSelect('None')}>
                  No Location
                </div>
                <div className="location-option" onClick={() => handleRegionSelect('Vic')}>
                  Victoria
                </div>
                <div className="location-option" onClick={() => handleRegionSelect('Nsw')}>
                  NSW
                </div>
                <div className="location-option" onClick={() => handleRegionSelect('Qld')}>
                  Queensland
                </div>
                <div className="location-option" onClick={() => handleRegionSelect('Bengaluru')}>
                  Bengaluru
                </div>
              </div>
            )}
          </div>
          </div>
        </div>
        <div className="settings-icon-wrapper" onClick={() => setShowSettingsPanel(!showSettingsPanel)} title="Settings">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12.22 2h-.44a2 2 0 00-2 2v.18a2 2 0 01-1 1.73l-.43.25a2 2 0 01-2 0l-.15-.08a2 2 0 00-2.73.73l-.22.38a2 2 0 00.73 2.73l.15.1a2 2 0 011 1.72v.51a2 2 0 01-1 1.74l-.15.09a2 2 0 00-.73 2.73l.22.38a2 2 0 002.73.73l.15-.08a2 2 0 012 0l.43.25a2 2 0 011 1.73V20a2 2 0 002 2h.44a2 2 0 002-2v-.18a2 2 0 011-1.73l.43-.25a2 2 0 012 0l.15.08a2 2 0 002.73-.73l.22-.39a2 2 0 00-.73-2.73l-.15-.08a2 2 0 01-1-1.74v-.5a2 2 0 011-1.74l.15-.09a2 2 0 00.73-2.73l-.22-.38a2 2 0 00-2.73-.73l-.15.08a2 2 0 01-2 0l-.43-.25a2 2 0 01-1-1.73V4a2 2 0 00-2-2z"></path>
            <circle cx="12" cy="12" r="3"></circle>
          </svg>
        </div>
        {showSettingsPanel && (
          <div className="settings-panel">
            <div className="settings-header">
              <h3>Settings</h3>
              <button className="settings-close" onClick={() => setShowSettingsPanel(false)}>&times;</button>
            </div>
            <div className="settings-content">
              <div className="setting-item">
                <label className="setting-label">Theme</label>
                <div className="theme-switch-wrapper" onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}>
                  <div className={`theme-toggle ${theme}`}>
                    <div className="theme-toggle-circle">
                      {theme === 'light' ? '🌙' : '☀️'}
                    </div>
                  </div>
                </div>
              </div>
              <div className="setting-item">
                <label className="setting-label">Target Office Percentage: {targetPercentage}%</label>
                <input
                  type="range"
                  min="10"
                  max="100"
                  step="5"
                  value={targetPercentage}
                  onChange={(e) => setTargetPercentage(parseInt(e.target.value))}
                  className="target-slider"
                />
                <div className="slider-labels">
                  <span>10%</span>
                  <span>50%</span>
                  <span>100%</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
      <div className="container">
        <div className="sidebar">
          <div className="stats-section">
            <h3>Monthly Stats - {monthNames[month]} {year}</h3>
            <div className="stats">
              <div className="stat-item">
                <span className="stat-label">WORKING DAYS:</span>
                <span className="stat-value">{stats.workingDays}</span>
              </div>
              <div className="stat-item">
                <span className="stat-label">ACTUAL OFFICE DAYS:</span>
                <span className="stat-value">{stats.actualOffice}</span>
              </div>
              {isCurrentOrFutureMonth() && (
                <div className="stat-item">
                  <span className="stat-label">PLANNED OFFICE DAYS (future) :</span>
                  <span className="stat-value">{stats.plannedOffice}</span>
                </div>
              )}
              <div className="stat-item">
                <span className="stat-label">HOLIDAY/LEAVE:</span>
                <span className="stat-value">{stats.holiday}</span>
              </div>
              <div className="stat-item percentage">
                <span className="stat-label">ACTUAL OFFICE DAYS %:</span>
                <div className="stat-value-row">
                  <span className="stat-value">{stats.actualOfficePercentage}%</span>
                  {parseFloat(stats.actualOfficePercentage) >= targetPercentage && (
                    <div className="achievement-inline">
                      <span className="achievement-icon-inline">🎉</span>
                      <span className="achievement-text-inline">Target Achieved!</span>
                    </div>
                  )}
                </div>
              </div>
              {isCurrentOrFutureMonth() && (
                <div className={`stat-item combined-percentage ${parseFloat(stats.totalOfficePercentage) >= targetPercentage ? 'success' : 'danger'}`}>
                  <span className="stat-label">PLANNED + ACTUAL DAYS %:</span>
                  <span className="stat-value">{stats.totalOfficePercentage}%</span>
                </div>
              )}
            </div>

            {historicalStats.length > 0 && (
              <div className="compact-trend">
                <h4>📈 Office Days Trend</h4>
                <div className="trend-bars">
                  {historicalStats.map((stat, index) => (
                    <div key={index} className="trend-item">
                      <div className="trend-month">{stat.monthShort}</div>
                      <div className="trend-bar-mini">
                        <div
                          className="trend-fill"
                          style={{ height: `${stat.percentage}%` }}
                          title={`${stat.percentage.toFixed(0)}%`}
                        ></div>
                      </div>
                      <div className="trend-percent">{stat.percentage.toFixed(0)}%</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="main-content">
          <div className="calendar-header">
            <div className="calendar-nav">
              <button onClick={() => changeMonth(-1)}>&lt; Prev</button>
              <h2>{monthNames[month]} {year}</h2>
              <button onClick={() => changeMonth(1)}>Next &gt;</button>
            </div>
            <div className="import-export-buttons">
              <button className="export-button" onClick={exportAllData}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                  <polyline points="17 8 12 3 7 8"></polyline>
                  <line x1="12" y1="3" x2="12" y2="15"></line>
                </svg>
                Export
              </button>
            </div>
          </div>

          <div className="legend">
            <div className="legend-item">
              <span className="legend-icon">🏢</span>
              <span>Office (Past/Today)</span>
            </div>
            <div className="legend-item">
              <span className="legend-icon">📅</span>
              <span>Planned Office (Future)</span>
            </div>
            <div className="legend-item">
              <span className="legend-icon">🌴</span>
              <span>Holiday/Leave</span>
            </div>
            <div className="legend-note">
              💡 Click on any date to mark attendance • Drag across dates to apply same status • Export attendance
            </div>
          </div>

          <div className="calendar">
            <div className="calendar-weekdays">
              {dayNames.map(day => (
                <div key={day} className="weekday">{day}</div>
              ))}
            </div>
            <div className="calendar-days">
              {renderCalendar()}
            </div>
          </div>
        </div>
      </div>

      <footer className="developer-footer">
        <div className="developer-info">
          <span className="developer-label">Developer : Nitish Thakur</span>
          <a href="mailto:nitish.thakur89@gmail.com" className="email-icon" title="Email: nitish.thakur89@gmail.com">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
              <polyline points="22,6 12,13 2,6"></polyline>
            </svg>
          </a>
          <a href="https://www.linkedin.com/in/nitish-thakur27/" className="linkedin-icon" target="_blank" rel="noopener noreferrer" title="LinkedIn: Nitish Thakur">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
              <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
            </svg>
          </a>
        </div>
      </footer>
    </div>
  );
}

export default App;
