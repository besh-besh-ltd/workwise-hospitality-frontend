import Image from 'next/image'
import Link from 'next/link'
import React from 'react'

const Dashboard = () => {
    return (
        <>
            <section className="container-fluid d-flex justify-content-center align-items-center flex-column vh-100">
                <div className="logo mb-2">
                    <Link href="/">
                        <Image
                            src="/assets/images/logo.png"
                            alt="Workwise"
                            width={300}
                            height={150}
                            priority={true}
                            className="img-fluid"
                        />
                    </Link>
                </div>
                <div className="heading display-2">Coming Soon</div>
            </section>
        </>
    )
}

export default Dashboard