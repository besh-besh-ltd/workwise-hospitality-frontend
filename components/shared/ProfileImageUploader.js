import FullLoader from "@/components/shared/FullLoader";
import Image from "next/image";


const ProfileImageUploader = ({ imageUrl, placeholderUrl, onChange, loading, disabled=false }) => {
  return (
    <div className="user-profile">
      {loading && <FullLoader />}
      {!loading && (
        <>
          <img
            src={imageUrl || placeholderUrl}
            alt="Profile"
            width={140}
            height={140}
          />
          {!disabled && ( 
          <label className="cameraicon">
            <Image
              src="/assets/images/camera-icon.png"
              alt="Upload"
              width={30}
              height={30}
            />
            <input type="file" name="file" onChange={onChange} />
          </label>
          )}
        </>
      )}
    </div>
  );
};

export default ProfileImageUploader;
