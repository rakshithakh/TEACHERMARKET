import React from 'react';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error('UI crashed:', error, info);
  }

  render() {
    if (this.state.error) {
      return (
        <div style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', background:'#f8fafc', padding:24 }}>
          <div style={{ maxWidth:520, width:'100%', background:'#fff', border:'1px solid #e5e7eb', borderRadius:12, padding:24 }}>
            <div style={{ fontSize:22, fontWeight:800, color:'#0f172a', marginBottom:8 }}>Something went wrong</div>
            <div style={{ fontSize:14, color:'#64748b', lineHeight:1.6, marginBottom:16 }}>
              This page hit a frontend error. Refresh once; if it stays, open DevTools Console and share the red error line.
            </div>
            <pre style={{ whiteSpace:'pre-wrap', overflow:'auto', background:'#f1f5f9', color:'#991b1b', borderRadius:8, padding:12, fontSize:12 }}>
              {this.state.error?.message || 'Unknown error'}
            </pre>
            <button type="button" onClick={() => window.location.reload()} style={{ marginTop:16, background:'#0f172a', color:'#fff', border:0, borderRadius:8, padding:'10px 16px', fontWeight:700, cursor:'pointer' }}>
              Reload
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
