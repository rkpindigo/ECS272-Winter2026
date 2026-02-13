import Choropleth from './components/Choropleth'
import Notes from './components/Notes'
import { NotesWithReducer, CountProvider } from './components/NotesWithReducer';
import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
import Box from '@mui/material/Box';
import { createTheme, ThemeProvider } from '@mui/material/styles';
import { grey } from '@mui/material/colors';
import Streamgraph from './components/Streamgraph';
import Linegraph from './components/Linegraph';

// Adjust the color theme for material ui
const theme = createTheme({
  palette: {
    primary:{
      main: grey[700],
    },
    secondary:{
      main: grey[700],
    }
  },
})

// For how Grid works, refer to https://mui.com/material-ui/react-grid/

function Layout() {
  return (
    <Box id='main-container'>
      <h1>Environmental Data Dashboard</h1>
      <Stack spacing={1} sx={{ height: '100%' }}>
        {/* Top row: Example component taking about 60% width */}
        <Grid container spacing={1} sx={{ height: '60%' }}>
          <Grid item xs={7} sx={{ border: '1px solid grey', borderRadius: '4px', padding: '8px' }}>
            <Choropleth />
          </Grid>
          <Grid item xs={5} sx={{ border: '1px solid grey', borderRadius: '4px', padding: '8px' }}>
            <Streamgraph />
          </Grid>
        </Grid>
        {/* Middle row: flexible spacer taking remaining height */}
        <Grid container sx={{ height: 'auto' }}>
          {/* flexible spacer to take remaining space */}
          <Grid size="grow" />
        </Grid>
        <Grid size={12} sx={{ height: '40%' }}>
          <Linegraph />
        </Grid>
      </Stack>
    </Box>
  )
}

function App() {
  return (
    <ThemeProvider theme={theme}>
      <Layout />
    </ThemeProvider>
  )
}

export default App
