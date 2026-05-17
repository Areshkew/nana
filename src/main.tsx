import ReactDOM from 'react-dom/client'
import App from './App'
import { VCSWindow } from './views/VCSWindow'
import './index.css'

const params = new URLSearchParams(window.location.search)
const view = params.get('view')

if (view === 'vcs') {
  ReactDOM.createRoot(document.getElementById('root')!).render(<VCSWindow />)
} else {
  ReactDOM.createRoot(document.getElementById('root')!).render(<App />)
}

