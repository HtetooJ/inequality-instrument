import React from 'react'
import { createRoot } from 'react-dom/client'
import { Instrument } from './instrument'
import './style.css'

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <Instrument />
  </React.StrictMode>,
)
