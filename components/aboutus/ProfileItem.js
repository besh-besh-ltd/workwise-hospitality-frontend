import Image from 'next/image'
import React from 'react'

const ProfileItem = ({item}) => {
  return (
    <>
        <div className="col-md-3 col-sm-6">
            <div className="key-card">
            <div className="key-card-img">
                <figure>
                {" "}
                <Image
                    src={item?.profile_image_url}
                    alt={item?.name}
                    width={255}
                    height={220}
                    priority={true}
                />
                </figure>
            </div>
            <div className="key-card-bottom-area">
                <div className="key-card-bottom-con">
                <span>{item?.name}</span>
                <p>{item?.designation}</p>
                </div>
            </div>
            </div>
        </div>
    </>
  )
}

export default ProfileItem