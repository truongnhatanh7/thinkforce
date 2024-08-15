import React, { useEffect, useState } from "react";
import { Outlet } from "react-router-dom";
import EarlyAccessAuth from "./EarlyAccessAuth";

const EarlyAccessWrapper = () => {
  const [isAuth, setIsAuth] = useState(false);

  useEffect(() => {});

  return <div>{isAuth ? <Outlet /> : <EarlyAccessAuth />}</div>;
};

export default EarlyAccessWrapper;
