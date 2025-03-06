+++
title = "Quickstart Guide"
date = "2025-03-05T12:55:52+01:00"
linkTitle = "Quickstart"
draft = false
weight = 2
+++

This section walks you through adding a new feature to CRADLE. It is divided into the following parts:

# Adding a File

To add a new feature, create a folder in the `/components` directory for your new component. For example, to add a Random Number component, create:

```
src/
└── renderer/
    └── src/
        └── components/
            └── RandomNumber/
                ├── RandomNumber.jsx
                └── RandomNumber.test.jsx
```

This "folder-per-file" structure is applied across components, hooks, services, and utils.


# Creating the Component

## 1. Utility Function

Create a utility function to generate a random number:

```js
// /utils/numberUtils/numberUtils.js

/**
 * Generates a random number between 1 and max.
 * @param {number} max - The maximum value.
 * @returns {number} A random number.
 */
const getRandomNumber = (max) => Math.floor(Math.random() * max) + 1;

export { getRandomNumber };
```

## 2. Custom Hook

Define a hook that uses the utility to manage random number state:

```js
// /hooks/useRandomNumber/useRandomNumber.js

import { useState } from 'react';
import { getRandomNumber } from '../../utils/numberUtils/numberUtils';

/**
 * Returns a random number and a function to update it.
 * @param {number} max - Maximum number (default: 100).
 * @returns {[number, function]} The random number and an updater function.
 */
const useRandomNumber = (max = 100) => {
  const [number, setNumber] = useState(getRandomNumber(max));
  const generateRandomNumber = () => setNumber(getRandomNumber(max));
  return [number, generateRandomNumber];
};

export default useRandomNumber;
```

## 3. Service Function

Create a service function to save the number:

```js
// /services/numberService/numberService.js

import { authAxios } from '../axiosInstance/axiosInstance';

/**
 * Saves the random number to the backend.
 * @param {number} number - The number to save.
 * @returns {Promise} Axios promise.
 */
const saveNumber = (number) => {
  return authAxios({
    method: 'POST',
    url: '/numbers/',
    data: { number },
  });
};

export { saveNumber };
```

## 4. The RandomNumber Component

Implement the component that displays the random number and provides controls:

```jsx
// /components/RandomNumber/RandomNumber.jsx

import React from 'react';
import useRandomNumber from '../../hooks/useRandomNumber/useRandomNumber';
import { saveNumber } from '../../services/numberService/numberService';
import useNavbarContents from '../../hooks/useNavbarContents/useNavbarContents';
import NavbarButton from '../NavbarButton/NavbarButton';

/**
 * Displays a random number with options to save or generate a new number.
 */
export default function RandomNumber() {
  const [randomNumber, generateRandomNumber] = useRandomNumber(100);

  const handleSaveNumber = () => {
    saveNumber(randomNumber)
      .then(() => console.log('Number saved successfully!'))
      .catch((error) => console.log(error));
  };

  useNavbarContents(
    <NavbarButton
      key="save-random-number-btn"
      icon={/* Insert a valid JSX icon element */}
      text="Save This Number"
      onClick={handleSaveNumber}
      data-testid="save-random-number-btn"
    />,
    [handleSaveNumber]
  );

  return (
    <div>
      <h2>Random Number: {randomNumber}</h2>
      <button
        className="btn btn-primary"
        onClick={handleSaveNumber}
        data-testid="save-random-number-btn"
      >
        Save This Number
      </button>
      <button className="btn btn-secondary" onClick={generateRandomNumber}>
        Generate New Number
      </button>
    </div>
  );
}

# Adding It to the App Component

Integrate your new component by adding a route in your main app file. For example:

```jsx
// App.jsx

import { HashRouter, Routes, Route } from 'react-router-dom';
import AuthProvider from './components/AuthProvider/AuthProvider.jsx';
import PrivateRoute from './components/PrivateRoute/PrivateRoute.jsx';
import Home from './components/Home/Home.jsx';
import RandomNumber from './components/RandomNumber/RandomNumber.jsx';
import NotFound from './components/NotFound/NotFound.jsx';

function App() {
  return (
    <HashRouter>
      <AuthProvider>
        <Routes>
          <Route element={<PrivateRoute fallback="/login" />}>
            <Route path="/" element={<Home />}>
              <Route path="/random-number" element={<RandomNumber />} />
            </Route>
          </Route>
          <Route path="*" element={<NotFound />} />
        </Routes>
      </AuthProvider>
    </HashRouter>
  );
}

export default App;
```

### Key Concepts

- **HashRouter:** Enables client-side routing in Electron. [Learn more](https://reactrouter.com/en/main/router-components/hash-router).
- **AuthProvider:** Provides client-side authentication.
- **PrivateRoute:** Protects routes by checking user authentication.
- **Home:** Main container that includes the navbar and sidebar.
- **Navbar & useNavbarContents:** Allows dynamic addition of buttons (e.g., the "Save This Number" button).
- **Sidebar:** Navigation component. To add an item, see the example below:

```jsx
// /components/Sidebar/Sidebar.jsx

import { useNavigate } from 'react-router-dom';
import SidebarSection from './SidebarSection';
import SidebarItem from './SidebarItem';
import { useCallback } from 'react';

export default function Sidebar() {
  const navigate = useNavigate();
  const randomNumberLocation = '/random-number';

  const handleRandomNumber = useCallback(() => {
    navigate(randomNumberLocation);
  }, [navigate]);

  return (
    <SidebarSection sectionType="header" height="fit" justify="start">
      <SidebarItem
        handleClick={handleRandomNumber}
        icon={/* Insert a valid JSX icon element */}
        text="Random Number"
        highlightedLocation={randomNumberLocation}
      />
    </SidebarSection>
  );
}
```
