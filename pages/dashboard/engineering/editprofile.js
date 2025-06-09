import React from "react";
import EditProfilePage from "@/components/dashboard/buyer/editprofile";
import Head from "next/head";

const EditProfile = () => {
    return (
        <>
            <Head>
                <title>Workwise | Edit Profile</title>
            </Head>
            <EditProfilePage />
        </>
    )
}

export default EditProfile;