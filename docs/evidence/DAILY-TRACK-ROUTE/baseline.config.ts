import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { execFileSync } from 'node:child_process';
import { relative } from 'node:path';

// Read the unchanged branch base for a like-for-like before capture.
const files=new Set(['src/features/activity/DailyTrack.tsx','src/features/activity/screens.tsx','src/features/activity/activity.css']);
export default defineConfig({plugins:[{name:'daily-track-before',enforce:'pre',load(id){const path=relative(process.cwd(),id);if(files.has(path))return execFileSync('git',['show',`71279ce6b36606f13d9bef3f9e8f5bd3775d407b:${path}`],{encoding:'utf8'});}},react()],server:{host:'127.0.0.1',port:5278,strictPort:true,proxy:{'/api':'http://127.0.0.1:3277'}},optimizeDeps:{entries:['index.html']}});
