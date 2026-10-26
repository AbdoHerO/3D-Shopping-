import { createRoot } from 'react-dom/client'
// only the subsets the shop uses (French/English: latin + latin-ext; Arabic: arabic)
import '@fontsource/cormorant-garamond/latin-500.css'
import '@fontsource/cormorant-garamond/latin-ext-500.css'
import '@fontsource/cormorant-garamond/latin-600.css'
import '@fontsource/cormorant-garamond/latin-ext-600.css'
import '@fontsource/cormorant-garamond/latin-500-italic.css'
import '@fontsource/jost/latin-400.css'
import '@fontsource/jost/latin-ext-400.css'
import '@fontsource/jost/latin-500.css'
import '@fontsource/jost/latin-ext-500.css'
import '@fontsource/tajawal/arabic-400.css'
import '@fontsource/tajawal/arabic-500.css'
import '@fontsource/tajawal/arabic-700.css'
import './styles.css'
import './i18n'
import App from './App'

createRoot(document.getElementById('root')!).render(<App />)
