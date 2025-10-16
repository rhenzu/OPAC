import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Box,
  Paper,
  Typography,
  Grid,
  CircularProgress,
  Card,
  CardContent,
  Button,
  Divider,
  TextField,
  MenuItem,
  Alert,
  Tooltip as MuiTooltip,
  Avatar,
  Stack,
  Chip,
} from '@mui/material';
import {
  NetworkCheck as NetworkIcon,
  Speed as SpeedIcon,
  Memory as MemoryIcon,
  Storage as StorageIcon,
  Sync as SyncIcon,
  People as PeopleIcon,
  Person as PersonIcon,
  Group as GroupIcon,
  CheckCircle as CheckCircleIcon,
  Cancel as CancelIcon,
} from '@mui/icons-material';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer } from 'recharts';
import { database } from '../../firebase';
import { ref, get, onValue, update } from 'firebase/database';
import { useAuth } from '../../contexts/AuthContext';

// Mock data for bandwidth and load simulation
const generateMockData = (points = 10) => {
  const data = [];
  const now = new Date();
  
  for (let i = points; i >= 0; i--) {
    const time = new Date(now.getTime() - i * 60000);
    data.push({
      time: time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      bandwidth: Math.floor(Math.random() * 100) + 50, // 50-150 Mbps
      latency: Math.floor(Math.random() * 50) + 10, // 10-60ms
      serverLoad: Math.floor(Math.random() * 30) + 10, // 10-40%
      memoryUsage: Math.floor(Math.random() * 40) + 30, // 30-70%
    });
  }
  return data;
};

// Format bytes to human-readable format
const formatBytes = (bytes: number, decimals = 2) => {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
};

// Interface for user data from firebase
interface UserData {
  id: string;
  name: string;
  email: string;
  role: string;
  lastActive?: string | null;
  isActive?: boolean;
}

// Interface for visitor statistics
interface VisitorStats {
  totalVisitors: number;
  dailyVisitors: number;
  lastUpdated: string;
  visitorsByDay: Record<string, number>;
}

const SystemMonitor: React.FC = () => {
  const [chartData, setChartData] = useState(generateMockData());
  const [dataPoint, setDataPoint] = useState({
    bandwidth: 0,
    latency: 0,
    serverLoad: 0,
    memoryUsage: 0,
    diskUsage: 65,
    totalVisitors: 0,
    activeUsers: 0,
    timeRange: '1h',
    activeUsersList: [] as { id: string, name: string, role: string, lastActivity: Date }[],
  });
  const [isLoading, setIsLoading] = useState(true);
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'disconnected' | 'connecting'>('connecting');
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [registeredUsers, setRegisteredUsers] = useState<UserData[]>([]);
  const [activeUserCount, setActiveUserCount] = useState(0);
  const [visitorStats, setVisitorStats] = useState<VisitorStats>({
    totalVisitors: 0,
    dailyVisitors: 0,
    lastUpdated: new Date().toISOString(),
    visitorsByDay: {}
  });
  const { currentUser } = useAuth();
  
  // WebSocket reference
  const wsRef = useRef<WebSocket | null>(null);
  
  // Fetch visitor stats and set up real-time listener
  useEffect(() => {
    // Create a function to initialize visitor stats if they don't exist
    const initializeVisitorStats = async () => {
      const visitorStatsRef = ref(database, 'statistics/visitors');
      const snapshot = await get(visitorStatsRef);
      
      if (!snapshot.exists()) {
        // If visitor stats don't exist, create initial data
        const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
        const initialVisitorStats: VisitorStats = {
          totalVisitors: 0,
          dailyVisitors: 0,
          lastUpdated: new Date().toISOString(),
          visitorsByDay: { [today]: 0 }
        };
        
        await update(visitorStatsRef, initialVisitorStats);
      }
    };
    
    // Initialize stats if they don't exist
    initializeVisitorStats();
    
    // Set up real-time listener for visitor stats
    const visitorStatsRef = ref(database, 'statistics/visitors');
    const unsubscribe = onValue(visitorStatsRef, (snapshot) => {
      if (snapshot.exists()) {
        const stats = snapshot.val() as VisitorStats;
        setVisitorStats(stats);
        
        // Update dataPoint with visitor stats
        setDataPoint(prev => ({
          ...prev,
          totalVisitors: stats.totalVisitors
        }));
      }
    });
    
    // Function to increment visitor count 
    // This would typically be called on site entry points
    // For demo purposes, we'll call it once per session
    const logVisitor = async () => {
      const visitorStatsRef = ref(database, 'statistics/visitors');
      const snapshot = await get(visitorStatsRef);
      
      if (snapshot.exists()) {
        const stats = snapshot.val() as VisitorStats;
        const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
        
        // Check if we need to reset daily visitors (if date changed)
        const lastDate = new Date(stats.lastUpdated).toISOString().split('T')[0];
        const dailyVisitors = lastDate === today ? stats.dailyVisitors + 1 : 1;
        
        // Update visitors by day
        const visitorsByDay = { ...stats.visitorsByDay };
        visitorsByDay[today] = (visitorsByDay[today] || 0) + 1;
        
        // Only keep the last 30 days
        const days = Object.keys(visitorsByDay).sort();
        if (days.length > 30) {
          const daysToRemove = days.slice(0, days.length - 30);
          daysToRemove.forEach(day => {
            delete visitorsByDay[day];
          });
        }
        
        // Update visitor stats
        await update(visitorStatsRef, {
          totalVisitors: stats.totalVisitors + 1,
          dailyVisitors,
          lastUpdated: new Date().toISOString(),
          visitorsByDay
        });
      }
    };
    
    // Log visitor (once per session)
    logVisitor();
    
    return () => {
      unsubscribe();
    };
  }, []);
  
  // Fetch real users from Firebase
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const usersRef = ref(database, 'users');
        const snapshot = await get(usersRef);
        
        if (snapshot.exists()) {
          const usersData = snapshot.val();
          const now = new Date();
          const usersList: UserData[] = [];
          let activeCount = 0;
          
          // Consider a user active if they've been online in the last 15 minutes
          const activeThreshold = 15 * 60 * 1000; // 15 minutes in milliseconds
          
          // Transform data into array and calculate active status
          Object.entries(usersData).forEach(([id, data]: [string, any]) => {
            const lastActive = data.lastActive ? new Date(data.lastActive) : null;
            const isActive = lastActive && (now.getTime() - lastActive.getTime() < activeThreshold);
            
            if (isActive) activeCount++;
            
            usersList.push({
              id,
              name: data.name || 'Unknown User',
              email: data.email || '',
              role: data.role || 'staff',
              lastActive: data.lastActive,
              isActive: !!isActive
            });
          });
          
          // Sort by active status (active first) and then by name
          usersList.sort((a, b) => {
            if (a.isActive === b.isActive) {
              return a.name.localeCompare(b.name);
            }
            return a.isActive ? -1 : 1;
          });
          
          setRegisteredUsers(usersList);
          setActiveUserCount(activeCount);
          
          // Update dataPoint with real user counts
          setDataPoint(prev => ({
            ...prev,
            activeUsers: activeCount,
            totalVisitors: usersList.length
          }));
        }
      } catch (error) {
        console.error('Error fetching users:', error);
      }
    };
    
    // Initial fetch
    fetchUsers();
    
    // Set up real-time listener for user status changes
    const usersRef = ref(database, 'users');
    const unsubscribe = onValue(usersRef, (snapshot) => {
      if (snapshot.exists()) {
        const usersData = snapshot.val();
        const now = new Date();
        const usersList: UserData[] = [];
        let activeCount = 0;
        
        // Consider a user active if they've been online in the last 15 minutes
        const activeThreshold = 15 * 60 * 1000; // 15 minutes in milliseconds
        
        // Transform data into array and calculate active status
        Object.entries(usersData).forEach(([id, data]: [string, any]) => {
          const lastActive = data.lastActive ? new Date(data.lastActive) : null;
          const isActive = lastActive && (now.getTime() - lastActive.getTime() < activeThreshold);
          
          if (isActive) activeCount++;
          
          usersList.push({
            id,
            name: data.name || 'Unknown User',
            email: data.email || '',
            role: data.role || 'staff',
            lastActive: data.lastActive,
            isActive: !!isActive
          });
        });
        
        // Sort by active status (active first) and then by name
        usersList.sort((a, b) => {
          if (a.isActive === b.isActive) {
            return a.name.localeCompare(b.name);
          }
          return a.isActive ? -1 : 1;
        });
        
        setRegisteredUsers(usersList);
        setActiveUserCount(activeCount);
        
        // Update dataPoint with real user counts
        setDataPoint(prev => ({
          ...prev,
          activeUsers: activeCount,
          totalVisitors: usersList.length
        }));
      }
    });
    
    // Update current user's activity status
    const updateUserActivity = async () => {
      if (currentUser && currentUser.uid) {
        const userRef = ref(database, `users/${currentUser.uid}`);
        try {
          await update(userRef, {
            lastActive: new Date().toISOString()
          });
        } catch (error) {
          console.error('Error updating user activity:', error);
        }
      }
    };
    
    // Update activity on component mount
    updateUserActivity();
    
    // Set interval to update current user's activity status every minute
    const activityInterval = setInterval(updateUserActivity, 60000);
    
    return () => {
      unsubscribe();
      clearInterval(activityInterval);
    };
  }, [currentUser]);
  
  // Initialize WebSocket connection
  useEffect(() => {
    // In a real implementation, this would be your actual WebSocket server endpoint
    // For this demo, we'll simulate with our mock data
    const connectWebSocket = () => {
      setConnectionStatus('connecting');
      
      // Close any existing connection
      if (wsRef.current) {
        wsRef.current.close();
      }
      
      // In a real implementation, you would connect to an actual WebSocket server:
      // wsRef.current = new WebSocket('wss://your-websocket-server.com/metrics');
      
      // For demo purposes, we'll simulate the WebSocket behavior
      const mockWsSetup = setTimeout(() => {
        setConnectionStatus('connected');
        setIsLoading(false);
        
        // Initialize with the last data point
        const initialData = chartData[chartData.length - 1];
        setDataPoint({
          bandwidth: initialData.bandwidth,
          latency: initialData.latency,
          serverLoad: initialData.serverLoad,
          memoryUsage: initialData.memoryUsage,
          diskUsage: 65,
          totalVisitors: visitorStats.totalVisitors, // Use accurate visitor stats
          activeUsers: activeUserCount, // Use actual active users count
          timeRange: '1h',
          activeUsersList: [],
        });
        
        setLastUpdated(new Date());
      }, 1200);
      
      return () => clearTimeout(mockWsSetup);
    };
    
    connectWebSocket();
    
    // In a real implementation, you would have WebSocket event handlers:
    // wsRef.current.onopen = () => setConnectionStatus('connected');
    // wsRef.current.onclose = () => setConnectionStatus('disconnected');
    // wsRef.current.onerror = () => setConnectionStatus('disconnected');
    
    return () => {
      // Clean up WebSocket connection on component unmount
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [chartData, registeredUsers.length, activeUserCount, visitorStats.totalVisitors]);
  
  // Simulate real-time data updates via WebSocket messages
  useEffect(() => {
    if (connectionStatus !== 'connected') return;
    
    // In a real implementation, you would process actual WebSocket messages:
    // wsRef.current.onmessage = (event) => {
    //   const data = JSON.parse(event.data);
    //   updateMetricsFromServer(data);
    // };
    
    // For demo purposes, we'll simulate WebSocket messages with an interval
    const simulateWsMessages = setInterval(() => {
      const lastPoint = chartData[chartData.length - 1];
      const now = new Date();
      
      // Random fluctuations for realistic data
      const newBandwidth = Math.max(50, Math.min(150, lastPoint.bandwidth + (Math.random() * 20 - 10)));
      const newLatency = Math.max(10, Math.min(60, lastPoint.latency + (Math.random() * 10 - 5)));
      const newServerLoad = Math.max(10, Math.min(40, lastPoint.serverLoad + (Math.random() * 8 - 4)));
      const newMemoryUsage = Math.max(30, Math.min(70, lastPoint.memoryUsage + (Math.random() * 8 - 4)));
      
      // Updated metrics for display (simulating a WebSocket message)
      // Use real user data from the user activity tracking
      const newMetrics = {
        bandwidth: newBandwidth,
        latency: newLatency,
        serverLoad: newServerLoad,
        memoryUsage: newMemoryUsage,
        diskUsage: 65 + Math.random() * 5,
        totalVisitors: visitorStats.totalVisitors, // Use accurate visitor count
        activeUsers: activeUserCount, // Use actual active users count
        timeRange: dataPoint.timeRange,
        activeUsersList: [], // Not needed as we're using registeredUsers
      };
      
      setDataPoint(newMetrics);
      setLastUpdated(new Date());
      
      // Add new data point for chart
      const newPoint = {
        time: now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        bandwidth: newBandwidth,
        latency: newLatency,
        serverLoad: newServerLoad,
        memoryUsage: newMemoryUsage,
      };
      
      setChartData(prev => [...prev.slice(1), newPoint]);
    }, 1000); // Update every second for more real-time feel
    
    return () => clearInterval(simulateWsMessages);
  }, [connectionStatus, chartData, dataPoint.timeRange, registeredUsers.length, activeUserCount, visitorStats.totalVisitors]);
  
  // Change time range
  const handleTimeRangeChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value;
    setDataPoint(prev => ({ ...prev, timeRange: value }));
    
    // Regenerate data based on new time range
    const points = value === '1h' ? 10 : value === '6h' ? 12 : 24;
    setChartData(generateMockData(points));
  };
  
  // Reconnect WebSocket on manual refresh
  const handleRefreshConnection = () => {
    setConnectionStatus('connecting');
    
    setTimeout(() => {
      setConnectionStatus('connected');
      setLastUpdated(new Date());
    }, 800);
  };
  
  // Calculate health status based on metrics
  const getSystemHealth = () => {
    const { serverLoad, memoryUsage, latency } = dataPoint;
    
    if (serverLoad > 35 || memoryUsage > 65 || latency > 50) {
      return { status: 'Warning', color: 'orange' };
    } else if (serverLoad > 25 || memoryUsage > 55 || latency > 40) {
      return { status: 'Moderate', color: '#FFC107' };
    } else {
      return { status: 'Healthy', color: 'green' };
    }
  };
  
  const healthStatus = getSystemHealth();
  
  // Format time ago for registered users
  const getTimeAgo = (dateStr: string | null | Date) => {
    if (!dateStr) return 'Never';
    
    const date = typeof dateStr === 'string' ? new Date(dateStr) : dateStr;
    const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);
    
    if (seconds < 60) return `${seconds} seconds ago`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes} minute${minutes !== 1 ? 's' : ''} ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours} hour${hours !== 1 ? 's' : ''} ago`;
    const days = Math.floor(hours / 24);
    return `${days} day${days !== 1 ? 's' : ''} ago`;
  };
  
  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
        <CircularProgress />
      </Box>
    );
  }
  
  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" gutterBottom sx={{ mb: 0 }}>
          System Monitor
        </Typography>
        
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <Box sx={{ 
            display: 'flex', 
            alignItems: 'center', 
            mr: 2, 
            color: connectionStatus === 'connected' ? 'success.main' : 
                  connectionStatus === 'connecting' ? 'warning.main' : 'error.main' 
          }}>
            <Box sx={{ 
              width: 10, 
              height: 10, 
              borderRadius: '50%', 
              bgcolor: connectionStatus === 'connected' ? 'success.main' : 
                      connectionStatus === 'connecting' ? 'warning.main' : 'error.main',
              mr: 1 
            }} />
            <Typography variant="caption">
              {connectionStatus === 'connected' ? 'Live' : 
               connectionStatus === 'connecting' ? 'Connecting...' : 'Disconnected'}
            </Typography>
          </Box>
          
          {lastUpdated && (
            <Typography variant="caption" color="text.secondary" sx={{ mr: 2 }}>
              Last updated: {lastUpdated.toLocaleTimeString()}
            </Typography>
          )}
          
          <Button 
            size="small" 
            startIcon={<SyncIcon />} 
            onClick={handleRefreshConnection}
            disabled={connectionStatus === 'connecting'}
          >
            Refresh
          </Button>
        </Box>
      </Box>
      
      {connectionStatus === 'disconnected' && (
        <Alert severity="error" sx={{ mb: 3 }}>
          Connection lost. Real-time updates are not available. 
          <Button 
            size="small" 
            sx={{ ml: 2 }} 
            onClick={handleRefreshConnection}
          >
            Reconnect
          </Button>
        </Alert>
      )}
      
      <Grid container spacing={3}>
        {/* System Health Summary */}
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 2, height: '100%' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <SpeedIcon color="primary" sx={{ mr: 1 }} />
              <Typography variant="h6">System Health</Typography>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', py: 3 }}>
              <Box
                sx={{
                  position: 'relative',
                  display: 'inline-flex',
                  mb: 2,
                }}
              >
                <CircularProgress
                  variant="determinate"
                  value={100 - dataPoint.serverLoad * 2}
                  size={120}
                  thickness={5}
                  sx={{ color: healthStatus.color }}
                />
                <Box
                  sx={{
                    top: 0,
                    left: 0,
                    bottom: 0,
                    right: 0,
                    position: 'absolute',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Typography variant="h5" component="div" color="text.secondary">
                    {healthStatus.status}
                  </Typography>
                </Box>
              </Box>
              <Typography variant="body1" color="text.secondary" align="center">
                Server load: {dataPoint.serverLoad.toFixed(1)}%
              </Typography>
              <Typography variant="body2" color="text.secondary" align="center">
                Memory usage: {dataPoint.memoryUsage.toFixed(1)}%
              </Typography>
              <Typography variant="body2" color="text.secondary" align="center">
                Response time: {dataPoint.latency.toFixed(0)}ms
              </Typography>
            </Box>
          </Paper>
        </Grid>
        
        {/* Active Users and Visitors Section */}
        <Grid item xs={12}>
          <Paper sx={{ p: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <PeopleIcon color="primary" sx={{ mr: 1 }} />
              <Typography variant="h6">User Activity & Visitor Monitoring</Typography>
            </Box>
            
            <Grid container spacing={3}>
              {/* Active Users Stats */}
              <Grid item xs={12} sm={6} md={3}>
                <Card 
                  sx={{ 
                    p: 2, 
                    display: 'flex', 
                    flexDirection: 'column', 
                    alignItems: 'center',
                    bgcolor: 'primary.light',
                    color: 'primary.contrastText',
                    height: '100%'
                  }}
                >
                  <PersonIcon sx={{ fontSize: 48, mb: 1, opacity: 0.9 }} />
                  <Typography variant="h3" sx={{ fontWeight: 'bold', mb: 1 }}>
                    {activeUserCount}
                  </Typography>
                  <Typography variant="subtitle1" sx={{ textAlign: 'center' }}>
                    Active Users
                  </Typography>
                  <Typography variant="caption" sx={{ textAlign: 'center', mt: 1, opacity: 0.8 }}>
                    Users active in last 15 min
                  </Typography>
                </Card>
              </Grid>
              
              {/* Total Users Stats */}
              <Grid item xs={12} sm={6} md={3}>
                <Card 
                  sx={{ 
                    p: 2, 
                    display: 'flex', 
                    flexDirection: 'column', 
                    alignItems: 'center',
                    bgcolor: 'secondary.light',
                    color: 'secondary.contrastText',
                    height: '100%'
                  }}
                >
                  <GroupIcon sx={{ fontSize: 48, mb: 1, opacity: 0.9 }} />
                  <Typography variant="h3" sx={{ fontWeight: 'bold', mb: 1 }}>
                    {registeredUsers.length}
                  </Typography>
                  <Typography variant="subtitle1" sx={{ textAlign: 'center' }}>
                    Registered Users
                  </Typography>
                  <Typography variant="caption" sx={{ textAlign: 'center', mt: 1, opacity: 0.8 }}>
                    Total accounts in system
                  </Typography>
                </Card>
              </Grid>
              
              {/* Daily Visitors Stats */}
              <Grid item xs={12} sm={6} md={3}>
                <Card 
                  sx={{ 
                    p: 2, 
                    display: 'flex', 
                    flexDirection: 'column', 
                    alignItems: 'center',
                    bgcolor: 'success.light',
                    color: 'success.contrastText',
                    height: '100%'
                  }}
                >
                  <PersonIcon sx={{ fontSize: 48, mb: 1, opacity: 0.9 }} />
                  <Typography variant="h3" sx={{ fontWeight: 'bold', mb: 1 }}>
                    {visitorStats.dailyVisitors}
                  </Typography>
                  <Typography variant="subtitle1" sx={{ textAlign: 'center' }}>
                    Today's Visitors
                  </Typography>
                  <Typography variant="caption" sx={{ textAlign: 'center', mt: 1, opacity: 0.8 }}>
                    Site visitors today
                  </Typography>
                </Card>
              </Grid>
              
              {/* Total Visitors Stats */}
              <Grid item xs={12} sm={6} md={3}>
                <Card 
                  sx={{ 
                    p: 2, 
                    display: 'flex', 
                    flexDirection: 'column', 
                    alignItems: 'center',
                    bgcolor: 'info.light',
                    color: 'info.contrastText',
                    height: '100%'
                  }}
                >
                  <GroupIcon sx={{ fontSize: 48, mb: 1, opacity: 0.9 }} />
                  <Typography variant="h3" sx={{ fontWeight: 'bold', mb: 1 }}>
                    {visitorStats.totalVisitors}
                  </Typography>
                  <Typography variant="subtitle1" sx={{ textAlign: 'center' }}>
                    Total Visitors
                  </Typography>
                  <Typography variant="caption" sx={{ textAlign: 'center', mt: 1, opacity: 0.8 }}>
                    All-time site visitors
                  </Typography>
                </Card>
              </Grid>
              
              {/* Visitor Trend and Active Users List */}
              <Grid item xs={12} md={6}>
                <Card sx={{ p: 2, height: '100%' }}>
                  <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 'bold' }}>
                    Visitor Trend (Last 7 Days)
                  </Typography>
                  
                  <Box sx={{ height: 200 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart
                        data={Object.entries(visitorStats.visitorsByDay)
                          .slice(-7)
                          .map(([date, count]) => ({
                            date,
                            visitors: count
                          }))}
                        margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis 
                          dataKey="date" 
                          tickFormatter={(date) => {
                            const d = new Date(date);
                            return `${d.getMonth()+1}/${d.getDate()}`;
                          }}
                        />
                        <YAxis />
                        <RechartsTooltip 
                          formatter={(value, name) => [value, 'Visitors']}
                          labelFormatter={(date) => {
                            const d = new Date(date);
                            return d.toLocaleDateString();
                          }}
                        />
                        <Line 
                          type="monotone" 
                          dataKey="visitors" 
                          stroke="#8884d8" 
                          strokeWidth={2}
                          dot={{ r: 4 }}
                          activeDot={{ r: 6 }}
                          isAnimationActive={false}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </Box>
                  
                  <Box
                    sx={{ 
                      display: 'flex', 
                      justifyContent: 'space-between', 
                      alignItems: 'center',
                      mt: 2
                    }}
                  >
                    <Typography variant="caption" color="text.secondary">
                      Last updated: {new Date(visitorStats.lastUpdated).toLocaleString()}
                    </Typography>
                  </Box>
                </Card>
              </Grid>
              
              {/* Active Users List */}
              <Grid item xs={12} md={6}>
                <Card sx={{ p: 2, height: '100%', maxHeight: 280, overflow: 'auto' }}>
                  <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 'bold' }}>
                    Registered Users Status
                  </Typography>
                  
                  <Stack spacing={1}>
                    {registeredUsers.map((user, index) => (
                      <Box 
                        key={user.id}
                        sx={{ 
                          display: 'flex', 
                          alignItems: 'center', 
                          p: 1,
                          borderRadius: 1,
                          bgcolor: index % 2 === 0 ? 'background.paper' : 'action.hover'
                        }}
                      >
                        <Avatar 
                          sx={{ 
                            width: 36, 
                            height: 36, 
                            mr: 2,
                            bgcolor: user.role === 'admin' 
                              ? 'primary.main' 
                              : user.role === 'librarian' 
                                ? 'secondary.main' 
                                : 'success.main'
                          }}
                        >
                          {user.name.charAt(0)}
                        </Avatar>
                        <Box sx={{ flexGrow: 1 }}>
                          <Typography variant="body2" sx={{ fontWeight: 'medium' }}>
                            {user.name}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
                          </Typography>
                        </Box>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Chip
                            size="small"
                            icon={user.isActive ? <CheckCircleIcon fontSize="small" /> : <CancelIcon fontSize="small" />}
                            label={user.isActive ? 'Active' : 'Inactive'}
                            color={user.isActive ? 'success' : 'default'}
                            variant={user.isActive ? 'filled' : 'outlined'}
                          />
                          <MuiTooltip title={user.lastActive ? new Date(user.lastActive).toLocaleString() : 'Never active'}>
                            <Typography variant="caption" color="text.secondary" sx={{ minWidth: '80px', textAlign: 'right' }}>
                              {getTimeAgo(user.lastActive || null)}
                            </Typography>
                          </MuiTooltip>
                        </Box>
                      </Box>
                    ))}
                    
                    {registeredUsers.length === 0 && (
                      <Typography variant="body2" color="text.secondary" sx={{ py: 2, textAlign: 'center' }}>
                        No registered users
                      </Typography>
                    )}
                  </Stack>
                </Card>
              </Grid>
            </Grid>
          </Paper>
        </Grid>
        
        {/* Current Metrics */}
        <Grid item xs={12} md={8}>
          <Paper sx={{ p: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <NetworkIcon color="primary" sx={{ mr: 1 }} />
              <Typography variant="h6">Network Metrics</Typography>
            </Box>
            
            <Grid container spacing={2}>
              <Grid item xs={6} md={6}>
                <Card variant="outlined">
                  <CardContent>
                    <Typography variant="subtitle2" color="text.secondary">
                      Bandwidth
                    </Typography>
                    <Typography variant="h6">
                      {dataPoint.bandwidth.toFixed(1)} Mbps
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              
              <Grid item xs={6} md={6}>
                <Card variant="outlined">
                  <CardContent>
                    <Typography variant="subtitle2" color="text.secondary">
                      Latency
                    </Typography>
                    <Typography variant="h6">
                      {dataPoint.latency.toFixed(0)} ms
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          </Paper>
        </Grid>
        
        {/* Resource Usage */}
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <MemoryIcon color="primary" sx={{ mr: 1 }} />
              <Typography variant="h6">Resource Usage</Typography>
            </Box>
            
            <Box sx={{ mb: 2 }}>
              <Typography variant="body2" sx={{ mb: 1 }}>
                CPU Load: {dataPoint.serverLoad.toFixed(1)}%
              </Typography>
              <Box sx={{ width: '100%', bgcolor: 'background.paper', borderRadius: 1 }}>
                <Box
                  sx={{
                    width: `${dataPoint.serverLoad}%`,
                    bgcolor: dataPoint.serverLoad > 35 ? 'error.main' : dataPoint.serverLoad > 25 ? 'warning.main' : 'success.main',
                    height: 10,
                    borderRadius: 1,
                  }}
                />
              </Box>
            </Box>
            
            <Box sx={{ mb: 2 }}>
              <Typography variant="body2" sx={{ mb: 1 }}>
                Memory Usage: {dataPoint.memoryUsage.toFixed(1)}%
              </Typography>
              <Box sx={{ width: '100%', bgcolor: 'background.paper', borderRadius: 1 }}>
                <Box
                  sx={{
                    width: `${dataPoint.memoryUsage}%`,
                    bgcolor: dataPoint.memoryUsage > 65 ? 'error.main' : dataPoint.memoryUsage > 55 ? 'warning.main' : 'success.main',
                    height: 10,
                    borderRadius: 1,
                  }}
                />
              </Box>
            </Box>
            
            <Box>
              <Typography variant="body2" sx={{ mb: 1 }}>
                Disk Usage: {dataPoint.diskUsage.toFixed(1)}%
              </Typography>
              <Box sx={{ width: '100%', bgcolor: 'background.paper', borderRadius: 1 }}>
                <Box
                  sx={{
                    width: `${dataPoint.diskUsage}%`,
                    bgcolor: dataPoint.diskUsage > 85 ? 'error.main' : dataPoint.diskUsage > 75 ? 'warning.main' : 'success.main',
                    height: 10,
                    borderRadius: 1,
                  }}
                />
              </Box>
            </Box>
          </Paper>
        </Grid>
        
        {/* Charts */}
        <Grid item xs={12} md={8}>
          <Paper sx={{ p: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <StorageIcon color="primary" sx={{ mr: 1 }} />
                <Typography variant="h6">Performance Metrics</Typography>
              </Box>
              
              <TextField
                select
                size="small"
                value={dataPoint.timeRange}
                onChange={handleTimeRangeChange}
                sx={{ width: 100 }}
              >
                <MenuItem value="1h">1 Hour</MenuItem>
                <MenuItem value="6h">6 Hours</MenuItem>
                <MenuItem value="24h">24 Hours</MenuItem>
              </TextField>
            </Box>
            
            <Box sx={{ height: 300 }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={chartData}
                  margin={{
                    top: 5,
                    right: 30,
                    left: 20,
                    bottom: 5,
                  }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="time" />
                  <YAxis yAxisId="left" />
                  <YAxis yAxisId="right" orientation="right" />
                  <RechartsTooltip />
                  <Legend />
                  <Line
                    yAxisId="left"
                    type="monotone"
                    dataKey="bandwidth"
                    name="Bandwidth (Mbps)"
                    stroke="#8884d8"
                    activeDot={{ r: 8 }}
                    isAnimationActive={false}
                  />
                  <Line
                    yAxisId="right"
                    type="monotone"
                    dataKey="latency"
                    name="Latency (ms)"
                    stroke="#82ca9d"
                    isAnimationActive={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </Box>
            
            <Divider sx={{ my: 2 }} />
            
            <Box sx={{ height: 300 }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={chartData}
                  margin={{
                    top: 5,
                    right: 30,
                    left: 20,
                    bottom: 5,
                  }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="time" />
                  <YAxis />
                  <RechartsTooltip />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="serverLoad"
                    name="Server Load (%)"
                    stroke="#FF5722"
                    activeDot={{ r: 8 }}
                    isAnimationActive={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="memoryUsage"
                    name="Memory Usage (%)"
                    stroke="#2196F3"
                    isAnimationActive={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </Box>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};

export default SystemMonitor; 