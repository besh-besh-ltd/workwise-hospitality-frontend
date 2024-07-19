import Loader from "@/components/shared/Loader";
import { getCommunicaitonList, getCommunicaitonSettings, setCommunicaitonSettings } from "@/services/Auth";
import React, { useEffect, useState } from "react";

const CommunicationSettingPage = () => {
  const [settingsList, setsettingsList] = useState([])
  const [settings, setsettings] = useState([])
  const [loading, setloading] = useState(false)


  useEffect(() => {
    getSettingsList()
  }, [])
  const getSettingsList = ()=>{
    setloading(true)
    getCommunicaitonList().then(res => {
      setloading(false)
      setsettingsList(res.data)
      getSettings()
    }).catch(err => {
      console.log(err)
    })
  }

  const getSettings = ()=>{
    setloading(true)
    getCommunicaitonSettings().then(res => {
      setloading(false)
      setsettings(res.data)
    }).catch(err => {
      console.log(err)
    })
  }

  const getChecked=(item,type) =>{
    //console.log(item, settings)
    if(settings.length > 0){
      let s = settings.filter((i)=>i.type_id == item.id)
      if(s.length > 0){
       return s[0][type] == 1? true : false
      }else{
        return false
      }
    }else{
      return false;
    }
  }

  const handleSwitchChange=(e,item,type)=>{
    setloading(true)
    let payload = {
      "type_id": item.id,
      "email":1,
      "sms":0
    }
    payload[type]=e.target.checked ? 1:0
   
    setCommunicaitonSettings(payload).then(res=>{
      setloading(false)
      getSettingsList()
    }).catch(err => {
      setloading(false)
      console.log(err)
    })
  }


  return (
    <>
    {loading && <Loader/>}
      <section className="vendor-common-header sc-pt-80">
        <div className="container-fluid">
          <h1 className="heading">Communication Settings</h1>
        </div>
      </section>

      <section className="comm-sett-sec-1">
        <div className="container-fluid">
          <div className="row">
            <div className="col-md-10">
              <div className="comm-sett-con">
                <table>
                  <thead>
                    <tr>
                      <th>Communication Preferences</th>
                      <th>Email</th>
                      <th>SMS</th>
                    </tr>
                  </thead>
                  <tbody>
                    
                    {!loading && settingsList.length > 0 && settingsList.map((item)=>{
                      return(
                        <tr key={item.id}>
                          <td>{item?.details}</td>
                          <td>
                            <label class="switch">                              
                              <input type="checkbox" onChange={(e)=>handleSwitchChange(e,item,'email')} checked={getChecked(item,'email')} />
                              <span class="slider round"></span>
                            </label>
                          </td>
                          <td>
                            <label class="switch">
                              <input type="checkbox" onChange={(e)=>handleSwitchChange(e,item,'sms')} checked={getChecked(item,'sms')} />
                              <span class="slider round"></span>
                            </label>
                          </td>
                        </tr>
                      )
                    })}                   
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
};

export default CommunicationSettingPage;
