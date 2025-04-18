import React, { Suspense } from 'react';
import { Outlet, Route, Routes, HashRouter } from 'react-router-dom';
import { useTheme } from './hooks/useTheme/useTheme';
import { ThemeProvider } from './contexts/ThemeContext/ThemeContext.jsx';
import { ModalProvider } from './contexts/ModalContext/ModalContext.jsx';
import CradleLoading from './components/CradleLoading/CradleLoading.jsx';

// Auth components promise (loaded first)
const authComponentsPromise = Promise.all([
  import('./components/Login/Login.jsx'),
  import('./components/Register/Register.jsx'),
  import('./components/ConfirmEmail/ConfirmEmail.jsx'),
  import('./components/ForgotPassword/ForgotPassword.jsx'),
  import('./components/ResetPassword/ResetPassword.jsx'),
  import('./components/AuthProvider/AuthProvider.jsx'),
]).then(([
  Login,
  Register,
  ConfirmEmail,
  ForgotPassword,
  ResetPassword,
  AuthProvider,
]) => ({
  Login: Login.default,
  Register: Register.default,
  ConfirmEmail: ConfirmEmail.default,
  ForgotPassword: ForgotPassword.default,
  ResetPassword: ResetPassword.default,
  AuthProvider: AuthProvider.default,
}));

// App components promise (loaded only after auth)
const appComponentsPromise = Promise.all([
  import('./components/NoteEditor/NoteEditor.jsx'),
  import('./components/Notes/Notes.jsx'),
  import('./components/Home/Home.jsx'),
  import('./components/PrivateRoute/PrivateRoute.jsx'),
  import('./components/FeatureNotImplemented/FeatureNotImplemented.jsx'),
  import('./components/AdminPanel/AdminPanel.jsx'),
  import('./components/AccountSettings/AccountSettings.jsx'),
  import('./components/Dashboard/Dashboard.jsx'),
  import('./components/NotFound/NotFound.jsx'),
  import('./components/Publish/Publish.jsx'),
  import('./components/NoteViewer/NoteViewer.jsx'),
  import('./components/NoteSelector/NoteSelector.jsx'),
  import('./components/Welcome/Welcome.jsx'),
  import('./components/ActivityList/ActivityList.jsx'),
  import('./components/ChangePassword/ChangePassword.jsx'),
  import('./components/GraphExplorer/GraphExplorer.jsx'),
  import('./components/FleetingNoteEditor/FleetingNoteEditor.jsx'),
  import('./components/ReportList/ReportList.jsx'),
  import('./components/Connectivity/Connectivity.jsx'),
]).then(([
  NoteEditor,
  Notes,
  Home,
  PrivateRoute,
  FeatureNotImplemented,
  AdminPanel,
  AccountSettings,
  Dashboard,
  NotFound,
  Publish,
  NoteViewer,
  NoteSelector,
  Welcome,
  ActivityList,
  ChangePassword,
  GraphExplorer,
  FleetingNoteEditor,
  ReportList,
  Connectivity,
]) => ({
  NoteEditor: NoteEditor.default,
  Notes: Notes.default,
  Home: Home.default,
  PrivateRoute: PrivateRoute.default,
  FeatureNotImplemented: FeatureNotImplemented.default,
  AdminPanel: AdminPanel.default,
  AccountSettings: AccountSettings.default,
  Dashboard: Dashboard.default,
  NotFound: NotFound.default,
  Publish: Publish.default,
  NoteViewer: NoteViewer.default,
  NoteSelector: NoteSelector.default,
  Welcome: Welcome.default,
  ActivityList: ActivityList.default,
  ChangePassword: ChangePassword.default,
  GraphExplorer: GraphExplorer.default,
  FleetingNoteEditor: FleetingNoteEditor.default,
  ReportList: ReportList.default,
  Connectivity: Connectivity.default,
}));

// Auth components
const Login = React.lazy(() => authComponentsPromise.then(m => ({ default: m.Login })));
const Register = React.lazy(() => authComponentsPromise.then(m => ({ default: m.Register })));
const ConfirmEmail = React.lazy(() => authComponentsPromise.then(m => ({ default: m.ConfirmEmail })));
const ForgotPassword = React.lazy(() => authComponentsPromise.then(m => ({ default: m.ForgotPassword })));
const ResetPassword = React.lazy(() => authComponentsPromise.then(m => ({ default: m.ResetPassword })));
const AuthProvider = React.lazy(() => authComponentsPromise.then(m => ({ default: m.AuthProvider })));

// App components
const NoteEditor = React.lazy(() => appComponentsPromise.then(m => ({ default: m.NoteEditor })));
const Notes = React.lazy(() => appComponentsPromise.then(m => ({ default: m.Notes })));
const Home = React.lazy(() => appComponentsPromise.then(m => ({ default: m.Home })));
const PrivateRoute = React.lazy(() => appComponentsPromise.then(m => ({ default: m.PrivateRoute })));
const FeatureNotImplemented = React.lazy(() => appComponentsPromise.then(m => ({ default: m.FeatureNotImplemented })));
const AdminPanel = React.lazy(() => appComponentsPromise.then(m => ({ default: m.AdminPanel })));
const AccountSettings = React.lazy(() => appComponentsPromise.then(m => ({ default: m.AccountSettings })));
const Dashboard = React.lazy(() => appComponentsPromise.then(m => ({ default: m.Dashboard })));
const NotFound = React.lazy(() => appComponentsPromise.then(m => ({ default: m.NotFound })));
const Publish = React.lazy(() => appComponentsPromise.then(m => ({ default: m.Publish })));
const NoteViewer = React.lazy(() => appComponentsPromise.then(m => ({ default: m.NoteViewer })));
const NoteSelector = React.lazy(() => appComponentsPromise.then(m => ({ default: m.NoteSelector })));
const Welcome = React.lazy(() => appComponentsPromise.then(m => ({ default: m.Welcome })));
const ActivityList = React.lazy(() => appComponentsPromise.then(m => ({ default: m.ActivityList })));
const ChangePassword = React.lazy(() => appComponentsPromise.then(m => ({ default: m.ChangePassword })));
const GraphExplorer = React.lazy(() => appComponentsPromise.then(m => ({ default: m.GraphExplorer })));
const FleetingNoteEditor = React.lazy(() => appComponentsPromise.then(m => ({ default: m.FleetingNoteEditor })));
const ReportList = React.lazy(() => appComponentsPromise.then(m => ({ default: m.ReportList })));
const Connectivity = React.lazy(() => appComponentsPromise.then(m => ({ default: m.Connectivity })));

function App() {
    const { isDarkMode } = useTheme();

    if (isDarkMode) {
        document.documentElement.setAttribute('data-theme', 'dark');
    } else {
        document.documentElement.setAttribute('data-theme', 'light');
    }

    return (
        <ThemeProvider>
            <ModalProvider>
                <HashRouter>
                    <Suspense fallback={<CradleLoading />}>
                        <AuthProvider>
                            <Routes>
                                {/* Auth routes - loaded quickly */}
                                <Route path='/login' element={<Login />} />
                                <Route path='/register' element={<Register />} />
                                <Route path='/confirm-email' element={<ConfirmEmail />} />
                                <Route path='/forgot-password' element={<ForgotPassword />} />
                                <Route path='/reset-password' element={<ResetPassword />} />
                                
                                {/* App routes - loaded only when needed */}
                                <Route element={<PrivateRoute fallback={'/login'} />}>
                                    <Route path='/' element={<Home />}>
                                        <Route index element={<Welcome />} />
                                        <Route path='/not-implemented' element={<FeatureNotImplemented />} />
                                        <Route path='/notes' element={<Notes />} />
                                        <Route path='/editor/:id' element={<FleetingNoteEditor />} />
                                        <Route path='/dashboards/:subtype/:name' element={<Dashboard />} />
                                        <Route path='/notes/:id' element={<NoteViewer />} />
                                        <Route path='/notes/:id/edit' element={<NoteEditor />} />
                                        <Route path='/notes' element={<NoteSelector />} />
                                        <Route path='/knowledge-graph' element={<GraphExplorer />} />
                                        <Route path='/connectivity' element={<Connectivity />} />
                                        <Route path='/reports/:report_id' element={<ReportList />} />
                                        <Route path='/publish' element={<Publish />} />
                                        <Route path='/change-password' element={<ChangePassword />} />
                                        <Route path='/account/' element={<AccountSettings target='me' />} />
                                        <Route path='/activity' element={<ActivityList />} />
                                        <Route path='/activity/:username' element={<ActivityList />} />
                                        <Route path='/admin' element={<Outlet />}>
                                            <Route index element={<AdminPanel />} />
                                            <Route path='/admin/add/user' element={<AccountSettings isEdit={false} />} />
                                        </Route>
                                    </Route>
                                </Route>
                                <Route path='/not-found' element={<NotFound message={"We can't seem to find the page you are looking for."} />} />
                                <Route path='*' element={<NotFound />} />
                            </Routes>
                        </AuthProvider>
                    </Suspense>
                </HashRouter>
            </ModalProvider>
        </ThemeProvider>
    );
}

export default App;
