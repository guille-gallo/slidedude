import React, { useState, useEffect } from 'react';

const UserProfile = ({ id }: { id: any }) => {
  const = useState<any>({ data: null, loading: true, error: null });

  useEffect(() => {
    fetch(`/api/users/${id}`).then(r => r.json())
      .then(data => setState({ data, loading: false, error: null }))
      .catch(error => setState({ data: null, loading: false, error }));
  },);

  if (state.loading) return <div>Loading...</div>;
  if (state.error) return <div>Error</div>;
  return state.data ? <div><h1>{state.data.name}</h1><p>{state.data.email}</p></div> : null;
};