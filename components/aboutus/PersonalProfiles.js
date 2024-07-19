import React from 'react'
import ProfileItem from './ProfileItem'
import Image from 'next/image'

const PersonalProfiles = ({ title = "Board of Directors", subtitle="Key Management Personnel", profiles=[], pb=0}) => {
  return (
    <>
        <section className={`about-sec-5 sc-pt-80 sc-pb-${pb}`}>
            <div className="container">
                <div className="common-header text-center">
                    <h6>{title}</h6>
                    <h2>{subtitle}</h2>
                </div>
                <div className="about-sec-5-con">
                    <div className="row text-center">
                        {profiles && profiles.map((item,index)=>{
                            return <ProfileItem item={item} index={`profile_item_${index}`} key={`profile_item_${index}`}/>
                        })}
                    </div>
                </div>
            </div>
        </section>
    </>
  )
}

export default PersonalProfiles