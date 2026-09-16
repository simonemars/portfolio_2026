import { Route, Routes } from 'react-router-dom'
import { AppLayout } from './components/AppLayout'
import { RequireSession } from './lib/RequireSession'
import { Graph } from './pages/Graph'
import { PeopleList } from './pages/PeopleList'
import { PersonDetail } from './pages/PersonDetail'
import { SignIn } from './pages/SignIn'

function App() {
  return (
    <Routes>
      <Route path="/sign-in" element={<SignIn />} />
      <Route
        element={
          <RequireSession>
            <AppLayout />
          </RequireSession>
        }
      >
        <Route path="/" element={<PeopleList />} />
        <Route path="/people/:id" element={<PersonDetail />} />
        <Route path="/graph" element={<Graph />} />
      </Route>
    </Routes>
  )
}

export default App
