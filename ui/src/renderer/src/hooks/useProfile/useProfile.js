import { useState, useEffect } from 'react';

export function useProfile() {
    const [profile, setProfile] = useState(null);

    return { profile, setProfile };
}
