import { useRouter } from 'next/router'
import React, { useEffect } from 'react'

const SolutionsPage = () => {
    const router = useRouter();

    useEffect(()=> {
        router.push('/solutions/civil')
    }, [])

    return (
        <></>
    )
}

export default SolutionsPage
