import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import storageInstance from "./storageInstance";

// Export each guard component individually for proper importing
export function AuthGuard({ children }) {
	const router = useRouter();
	const [authorized, setAuthorized] = useState(false);

	let initialToken = null;

	useEffect(() => {
		if (typeof window !== "undefined" && window.localStorage) {
			let token = storageInstance.getStorage("token");
			initialToken = token;
		}

		// on initial load - run auth check
		authCheck(router.asPath);

		// on route change start - hide page content by setting authorized to false
		const hideContent = () => setAuthorized(false);
		router.events.on("routeChangeStart", hideContent);

		// on route change complete - run auth check
		router.events.on("routeChangeComplete", authCheck);

		// unsubscribe from events in useEffect return function
		return () => {
			router.events.off("routeChangeStart", hideContent);
			router.events.off("routeChangeComplete", authCheck);
		};

		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	function authCheck(url) {
		// redirect to login page if accessing a private page and not logged in
		const publicPaths = ["/"];
		const path = url.split("?")[0];
		const token = initialToken;

		if (!token && !publicPaths.includes(path)) {
			setAuthorized(false);
			router.push({
				pathname: "/",
				query: { returnUrl: router.asPath },
			});
		} else {
			setAuthorized(true);
		}
	}

	return authorized && children;
}

export function AdminGuard({ children }) {
	const router = useRouter();
	const [authorized, setAuthorized] = useState(false);

	useEffect(() => {
		// on initial load - run auth check
		adminAuthCheck(router.asPath);

		// on route change start - hide page content by setting authorized to false
		const hideContent = () => setAuthorized(false);
		router.events.on("routeChangeStart", hideContent);

		// on route change complete - run auth check
		router.events.on("routeChangeComplete", adminAuthCheck);

		// unsubscribe from events in useEffect return function
		return () => {
			router.events.off("routeChangeStart", hideContent);
			router.events.off("routeChangeComplete", adminAuthCheck);
		};

		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	function adminAuthCheck(url) {
		// Check if user is logged in and is an admin
		const token = storageInstance.getStorage("token");
		const userType = storageInstance.getStorage("current-user-type");
		
		if (!token) {
			setAuthorized(false);
			router.push({
				pathname: "/",
				query: { returnUrl: router.asPath },
			});
		} else if (userType !== "admin") {
			setAuthorized(false);
			// Redirect to their appropriate dashboard based on user type
			if (userType === "buyer") {
				router.push("/dashboard/buyer");
			} else if (userType === "vendor") {
				router.push("/dashboard/vendor");
			} else if (userType === "top-management") {
				router.push("/dashboard/top-management");
			} else if (userType === "engineering") {
				router.push("/dashboard/engineering");
			} else if (userType === "finance") {
				router.push("/dashboard/finance");
			} else {
				router.push("/"); // Fallback
			}
		} else {
			setAuthorized(true);
		}
	}

	return authorized && children;
}

export function TopManagementGuard({ children }) {
	const router = useRouter();
	const [authorized, setAuthorized] = useState(false);

	useEffect(() => {
		// on initial load - run auth check
		topManagementAuthCheck(router.asPath);

		// on route change start - hide page content by setting authorized to false
		const hideContent = () => setAuthorized(false);
		router.events.on("routeChangeStart", hideContent);

		// on route change complete - run auth check
		router.events.on("routeChangeComplete", topManagementAuthCheck);

		// unsubscribe from events in useEffect return function
		return () => {
			router.events.off("routeChangeStart", hideContent);
			router.events.off("routeChangeComplete", topManagementAuthCheck);
		};

		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	function topManagementAuthCheck(url) {
		// Check if user is logged in and is a top management user
		const token = storageInstance.getStorage("token");
		const userType = storageInstance.getStorage("current-user-type");
		
		if (!token) {
			setAuthorized(false);
			router.push({
				pathname: "/",
				query: { returnUrl: router.asPath },
			});
		} else if (userType !== "top-management") {
			setAuthorized(false);
			// Redirect to their appropriate dashboard based on user type
			if (userType === "buyer") {
				router.push("/dashboard/buyer");
			} else if (userType === "vendor") {
				router.push("/dashboard/vendor");
			} else if (userType === "admin") {
				router.push("/dashboard/admin");
			} else if (userType === "engineering") {
				router.push("/dashboard/engineering");
			} else if (userType === "finance") {
				router.push("/dashboard/finance");
			} else {
				router.push("/"); // Fallback
			}
		} else {
			setAuthorized(true);
		}
	}

	return authorized && children;
}

export function EngineeringGuard({ children }) {
	const router = useRouter();
	const [authorized, setAuthorized] = useState(false);

	useEffect(() => {
		// on initial load - run auth check
		engineeringAuthCheck(router.asPath);

		// on route change start - hide page content by setting authorized to false
		const hideContent = () => setAuthorized(false);
		router.events.on("routeChangeStart", hideContent);

		// on route change complete - run auth check
		router.events.on("routeChangeComplete", engineeringAuthCheck);

		// unsubscribe from events in useEffect return function
		return () => {
			router.events.off("routeChangeStart", hideContent);
			router.events.off("routeChangeComplete", engineeringAuthCheck);
		};

		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	function engineeringAuthCheck(url) {
		// Check if user is logged in and is an engineering user
		const token = storageInstance.getStorage("token");
		const userType = storageInstance.getStorage("current-user-type");
		
		if (!token) {
			setAuthorized(false);
			router.push({
				pathname: "/",
				query: { returnUrl: router.asPath },
			});
		} else if (userType !== "engineering") {
			setAuthorized(false);
			// Redirect to their appropriate dashboard based on user type
			if (userType === "buyer") {
				router.push("/dashboard/buyer");
			} else if (userType === "vendor") {
				router.push("/dashboard/vendor");
			} else if (userType === "admin") {
				router.push("/dashboard/admin");
			} else if (userType === "top-management") {
				router.push("/dashboard/top-management");
			} else if (userType === "finance") {
				router.push("/dashboard/finance");
			} else {
				router.push("/"); // Fallback
			}
		} else {
			setAuthorized(true);
		}
	}

	return authorized && children;
}

export function FinanceGuard({ children }) {
	const router = useRouter();
	const [authorized, setAuthorized] = useState(false);

	useEffect(() => {
		// on initial load - run auth check
		financeAuthCheck(router.asPath);

		// on route change start - hide page content by setting authorized to false
		const hideContent = () => setAuthorized(false);
		router.events.on("routeChangeStart", hideContent);

		// on route change complete - run auth check
		router.events.on("routeChangeComplete", financeAuthCheck);

		// unsubscribe from events in useEffect return function
		return () => {
			router.events.off("routeChangeStart", hideContent);
			router.events.off("routeChangeComplete", financeAuthCheck);
		};

		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	function financeAuthCheck(url) {
		// Check if user is logged in and is a finance user
		const token = storageInstance.getStorage("token");
		const userType = storageInstance.getStorage("current-user-type");
		
		if (!token) {
			setAuthorized(false);
			router.push({
				pathname: "/",
				query: { returnUrl: router.asPath },
			});
		} else if (userType !== "finance") {
			setAuthorized(false);
			// Redirect to their appropriate dashboard based on user type
			if (userType === "buyer") {
				router.push("/dashboard/buyer");
			} else if (userType === "vendor") {
				router.push("/dashboard/vendor");
			} else if (userType === "admin") {
				router.push("/dashboard/admin");
			} else if (userType === "top-management") {
				router.push("/dashboard/top-management");
			} else if (userType === "engineering") {
				router.push("/dashboard/engineering");
			} else {
				router.push("/"); // Fallback
			}
		} else {
			setAuthorized(true);
		}
	}

	return authorized && children;
}
